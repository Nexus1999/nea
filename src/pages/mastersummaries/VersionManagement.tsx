"use client";

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { FileText, Download, Loader2, History } from 'lucide-react';
import { toast } from 'sonner';

const VersionManagement = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generateReport = async (v1Id: string, v2Id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('compare-versions', {
        body: { version1Id: v1Id, version2Id: v2Id, format: 'json' }
      });

      if (error) throw error;
      setReportData(data);
      toast.success("Difference report generated successfully");
    } catch (error: any) {
      toast.error(`Failed to generate report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (v1Id: string, v2Id: string) => {
    setIsGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('compare-versions', {
        body: { version1Id: v1Id, version2Id: v2Id, format: 'pdf' }
      });

      if (error) throw error;

      // Create a blob from the response and trigger download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `diff-report-${v1Id}-${v2Id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      toast.error(`Failed to download PDF: ${error.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="w-8 h-8" />
          Version Management
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Versions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* This would normally be mapped from your versions data */}
              <TableRow>
                <TableCell>v1.0</TableCell>
                <TableCell>2023-10-01</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => generateReport('v1-id', 'v2-id')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Compare with v1.1
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Difference Report</DialogTitle>
                      </DialogHeader>
                      
                      {loading ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      ) : reportData ? (
                        <div className="space-y-4">
                          <div className="bg-muted p-4 rounded-lg">
                            <h3 className="font-semibold">{reportData.title}</h3>
                            <p className="text-sm text-muted-foreground">{reportData.summary}</p>
                          </div>
                          
                          <div className="space-y-2">
                            {reportData.changes.map((change: any, idx: number) => (
                              <div key={idx} className="border rounded-md p-3">
                                <div className="flex justify-between mb-2">
                                  <span className="font-medium">{change.section}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    change.status === 'modified' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {change.status}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="p-2 bg-red-50 rounded">
                                    <p className="text-xs font-bold text-red-700 mb-1">OLD</p>
                                    {change.oldValue}
                                  </div>
                                  <div className="p-2 bg-green-50 rounded">
                                    <p className="text-xs font-bold text-green-700 mb-1">NEW</p>
                                    {change.newValue}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end pt-4">
                            <Button 
                              onClick={() => downloadPdf('v1-id', 'v2-id')}
                              disabled={isGeneratingPdf}
                            >
                              {isGeneratingPdf ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center py-8 text-muted-foreground">No data available.</p>
                      )}
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VersionManagement;