import { Readable } from 'stream';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { db, revisionsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import express, { Router, type IRouter, type Request, type Response } from 'express';

import { logAudit } from '../lib/audit';
import {
  isLocalStorageMode,
  saveLocalObject,
  localObjectExists,
  getLocalObjectStream,
} from '../lib/localFileStorage';
import { randomUUID } from 'crypto';
import { ObjectPermission } from '../lib/objectAcl';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { verifyToken } = await import('../middlewares/auth');
    const token = authHeader.slice(7);
    if (!verifyToken(token)) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      let uploadURL: string;
      let objectPath: string;

      if (isLocalStorageMode()) {
        // Local development: "presigned URL" is just our own PUT endpoint.
        const objectId = randomUUID();
        uploadURL = `/api/storage/local-upload/${objectId}`;
        objectPath = `/objects/uploads/${objectId}`;
      } else {
        uploadURL = await objectStorageService.getObjectEntityUploadURL();
        objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      }

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * PUT /storage/local-upload/:id
 *
 * Local-development upload target (replaces the cloud presigned URL when
 * running outside Replit). Accepts the raw file body and stores it on disk.
 * The object id is an unguessable UUID minted by request-url, and each id
 * can only be written once.
 */
router.put(
  '/storage/local-upload/:id',
  express.raw({ type: '*/*', limit: '100mb' }),
  async (req: Request, res: Response) => {
    if (!isLocalStorageMode()) {
      res.status(404).json({ error: 'Not available' });
      return;
    }
    try {
      const objectId = req.params.id as string;
      const body = req.body as Buffer;
      if (!body || !Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: 'Empty upload body' });
        return;
      }
      try {
        await saveLocalObject(objectId, body);
      } catch (writeError) {
        if ((writeError as NodeJS.ErrnoException).code === 'EEXIST') {
          res.status(409).json({ error: 'Object already exists' });
          return;
        }
        throw writeError;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      req.log.error({ err: error }, 'Error storing local upload');
      res.status(500).json({ error: 'Failed to store upload' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { verifyToken } = await import('../middlewares/auth');
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;

    let localFile: { stream: NodeJS.ReadableStream; size: number } | null =
      null;
    let response: globalThis.Response | null = null;

    if (isLocalStorageMode()) {
      const objectId = wildcardPath.startsWith('uploads/')
        ? wildcardPath.slice('uploads/'.length)
        : wildcardPath;
      if (!localObjectExists(objectId)) {
        throw new ObjectNotFoundError();
      }
      localFile = await getLocalObjectStream(objectId);
    } else {
      const objectFile =
        await objectStorageService.getObjectEntityFile(objectPath);
      response = await objectStorageService.downloadObject(objectFile);
    }

    // Audit the download (compliance requirement). Resolve the revision
    // that owns this file so the log carries documentId + revisionId.
    try {
      const [revision] = await db
        .select({
          id: revisionsTable.id,
          documentId: revisionsTable.documentId,
          revisionNumber: revisionsTable.revisionNumber,
          fileName: revisionsTable.fileName,
        })
        .from(revisionsTable)
        .where(eq(revisionsTable.filePath, objectPath))
        .limit(1);

      await logAudit({
        userId: payload.sub,
        action: 'DOWNLOAD_FILE',
        module: 'storage',
        description: revision
          ? `Downloaded file "${revision.fileName ?? objectPath}" (document ID ${revision.documentId}, revision ${revision.revisionNumber}, path ${objectPath})`
          : `Downloaded file at ${objectPath}`,
        recordType: revision ? 'revision' : undefined,
        recordId: revision?.id,
        newValue: JSON.stringify({
          filePath: objectPath,
          documentId: revision?.documentId ?? null,
          revisionId: revision?.id ?? null,
        }),
        req,
      });
    } catch (auditError) {
      req.log.error({ err: auditError }, 'Failed to audit file download');
    }

    if (localFile) {
      res.status(200);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(localFile.size));
      res.setHeader('Cache-Control', 'private, max-age=3600');
      localFile.stream.pipe(res);
    } else if (response) {
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
