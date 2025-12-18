import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Pen, XCircle, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { Inspection } from "./types";

interface InspectionSignatureProps {
  inspection: Inspection;
  isManager: boolean;
  canSign: boolean;
  managerSigned: boolean;
  tenantSigned: boolean;
  onSign: (signatureData: any) => Promise<void>;
  isSigning: boolean;
}

export function InspectionSignature({
  inspection,
  isManager,
  canSign,
  managerSigned,
  tenantSigned,
  onSign,
  isSigning,
}: InspectionSignatureProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (showCanvas && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      const context = canvas.getContext('2d');
      if (context) {
        context.scale(2, 2);
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        contextRef.current = context;
      }
    }
  }, [showCanvas]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const rect = canvas.getBoundingClientRect();
    contextRef.current.beginPath();
    contextRef.current.moveTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    contextRef.current.lineTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (canvasRef.current && contextRef.current) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleSign = async () => {
    if (!canvasRef.current) return;
    
    const signatureData = canvasRef.current.toDataURL('image/png');
    await onSign({
      signature: signatureData,
      signedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    setShowCanvas(false);
  };

  const canManagerSign = isManager && canSign && !managerSigned;
  const canTenantSign = !isManager && canSign && !tenantSigned;
  const userCanSign = canManagerSign || canTenantSign;

  return (
    <div className="space-y-4">
      {/* Manager Signature */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Property Manager Signature
            {managerSigned ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Signed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                <XCircle className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {managerSigned ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Signed on {formatDate(inspection.manager_signed_at!)}
              </p>
              {inspection.manager_signature_data?.signature && (
                <img 
                  src={inspection.manager_signature_data.signature} 
                  alt="Manager signature"
                  className="h-16 border rounded bg-white"
                />
              )}
            </div>
          ) : canManagerSign ? (
            <div>
              {!showCanvas ? (
                <Button onClick={() => setShowCanvas(true)}>
                  <Pen className="h-4 w-4 mr-1" />
                  Sign Now
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for manager to sign
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tenant Signature */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Tenant Signature
            {tenantSigned ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Signed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                <XCircle className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenantSigned ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Signed on {formatDate(inspection.tenant_signed_at!)}
              </p>
              {inspection.tenant_signature_data?.signature && (
                <img 
                  src={inspection.tenant_signature_data.signature} 
                  alt="Tenant signature"
                  className="h-16 border rounded bg-white"
                />
              )}
            </div>
          ) : canTenantSign ? (
            <div>
              {!showCanvas ? (
                <Button onClick={() => setShowCanvas(true)}>
                  <Pen className="h-4 w-4 mr-1" />
                  Sign Now
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for tenant to sign
            </p>
          )}
        </CardContent>
      </Card>

      {/* Signature Canvas (shared) */}
      {showCanvas && userCanSign && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Draw Your Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border rounded-lg bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-32 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearSignature}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button variant="outline" onClick={() => setShowCanvas(false)}>
                Cancel
              </Button>
              <Button onClick={handleSign} disabled={isSigning}>
                {isSigning ? "Signing..." : "Confirm Signature"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Status */}
      {inspection.status === 'completed' && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Inspection Complete</p>
                <p className="text-sm opacity-80">
                  Completed on {formatDate(inspection.completed_at!)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
