import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useVerifyQrCode } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default function Verify() {
  const params = useParams();
  const token = params.token as string;
  
  const { data: result, isLoading, error } = useVerifyQrCode(token, {
    query: {
      enabled: !!token,
      retry: false
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center font-mono text-slate-500 animate-pulse">
          VERIFYING BLOCKCHAIN SIGNATURE...
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-xl">
          <div className="bg-red-600 h-2 w-full" />
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-6 font-mono text-sm">
              The provided QR code could not be verified or is structurally invalid.
            </p>
          </CardContent>
          <CardFooter className="justify-center bg-slate-100 py-3 border-t">
            <p className="text-xs text-slate-500 font-mono uppercase">eDocs Control System</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isObsolete = result.status === 'obsolete';
  const isInvalid = result.status === 'invalid';
  const isValid = result.valid && !isObsolete;

  let headerColor = "bg-emerald-600";
  let iconBg = "bg-emerald-100";
  let iconColor = "text-emerald-600";
  let titleColor = "text-emerald-700";
  let Icon = CheckCircle2;
  let title = "Document Verified";
  
  if (isObsolete) {
    headerColor = "bg-amber-500";
    iconBg = "bg-amber-100";
    iconColor = "text-amber-600";
    titleColor = "text-amber-700";
    Icon = AlertCircle;
    title = "Obsolete Revision";
  } else if (isInvalid || !result.valid) {
    headerColor = "bg-red-600";
    iconBg = "bg-red-100";
    iconColor = "text-red-600";
    titleColor = "text-red-700";
    Icon = XCircle;
    title = "Invalid Document";
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Card className="max-w-md w-full shadow-2xl overflow-hidden rounded-sm border-slate-200">
        <div className={`${headerColor} h-3 w-full`} />
        
        <CardHeader className="text-center pb-2 pt-8">
          <div className={`mx-auto w-20 h-20 ${iconBg} rounded-full flex items-center justify-center mb-4`}>
            <Icon className={`w-10 h-10 ${iconColor}`} />
          </div>
          <CardTitle className={`text-3xl font-bold tracking-tight ${titleColor}`}>
            {title}
          </CardTitle>
          <p className="font-mono text-sm mt-2 text-slate-500 max-w-[250px] mx-auto leading-relaxed">
            {result.message}
          </p>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="bg-slate-100 rounded p-4 space-y-4 font-mono text-sm border border-slate-200">
            <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-slate-200 pb-3">
              <span className="text-slate-500 font-bold">DOC NO:</span>
              <span className="font-bold text-slate-900">{result.documentNumber || 'UNKNOWN'}</span>
            </div>
            
            <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-slate-200 pb-3">
              <span className="text-slate-500 font-bold">TITLE:</span>
              <span className="text-slate-900">{result.documentTitle || '-'}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
              <div>
                <div className="text-slate-500 text-xs font-bold mb-1">REVISION</div>
                <div className={`font-bold text-lg ${isObsolete ? 'text-amber-600' : 'text-slate-900'}`}>
                  {result.revisionNumber || '-'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs font-bold mb-1">COPY</div>
                <div className="font-bold text-lg text-slate-900">{result.copyNumber || 'MASTER'}</div>
              </div>
            </div>

            {isObsolete && result.currentRevisionNumber && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-xs font-bold">
                WARNING: Current approved revision is {result.currentRevisionNumber}. Do not use this copy for production.
              </div>
            )}
            
            <div className="text-xs text-slate-500 space-y-1 pt-2">
              <div className="flex justify-between">
                <span>Printed By:</span>
                <span className="text-slate-700">{result.printedBy || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Printed At:</span>
                <span className="text-slate-700">{formatDate(result.printedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Verified At:</span>
                <span className="text-slate-700">{formatDate(result.verifiedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="justify-center bg-slate-900 py-4 mt-2">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">eDocs Control System</p>
            <p className="text-[9px] text-slate-600 font-mono mt-1">Verification Record</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}