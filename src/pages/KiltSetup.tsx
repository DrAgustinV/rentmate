import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Key, Copy, CheckCircle } from "lucide-react";
import { showToast } from "@/lib/toastUtils";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function KiltSetup() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string> | null>(null);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const checkAdminRole = async () => {
    const user = await authService.getCurrentUser();
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    
    if (error || !data) {
      console.error('Role check error:', error);
      navigate('/properties');
      return;
    }
    
    setIsAdmin(data);
    };

    checkAdminRole();
  }, [navigate]);

  const generateCredentials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-kilt-test-credentials');

      if (error) throw error;

      if (data.success) {
        setCredentials(data.credentials);
        showToast.success('Test credentials generated successfully');
      } else {
        throw new Error('Failed to generate credentials');
      }
    } catch (error) {
      console.error('Error generating credentials:', error);
      showToast.error('Failed to generate test credentials');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    showToast.success('Copied to clipboard');
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  if (isAdmin === null) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            KILT Protocol Setup
          </CardTitle>
          <CardDescription>
            Generate test credentials for KILT testnet integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              This tool generates test credentials for development on KILT Peregrine testnet. 
              Do not use these for production!
            </AlertDescription>
          </Alert>

          {!credentials && (
            <Button onClick={generateCredentials} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Test Credentials
            </Button>
          )}

          {credentials && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Credentials generated successfully! Follow the instructions below.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Network</span>
                    <span className="text-sm font-mono">{credentials.network}</span>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">DID</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(credentials.did, 'did')}
                    >
                      {copied.did ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <code className="text-xs block break-all">{credentials.did}</code>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Mnemonic (Secret!)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(credentials.mnemonic, 'mnemonic')}
                    >
                      {copied.mnemonic ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <code className="text-xs block break-all bg-yellow-50 p-2 rounded border border-yellow-200">
                    {credentials.mnemonic}
                  </code>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Address</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(credentials.address, 'address')}
                    >
                      {copied.address ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <code className="text-xs block break-all">{credentials.address}</code>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800 space-y-2">
                  <p className="font-semibold">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {credentials.instructions.map((instruction: string, index: number) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCredentials(null)} className="flex-1">
                  Generate New Credentials
                </Button>
                <Button asChild className="flex-1">
                  <a href="https://faucet.peregrine.kilt.io/" target="_blank" rel="noopener noreferrer">
                    Get Testnet Tokens
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AppLayout>
  );
}
