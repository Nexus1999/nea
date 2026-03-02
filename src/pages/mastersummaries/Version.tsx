"use client";

import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MasterSummaryVersion = () => {
  const { id } = useParams();
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Difference Report / Version History</h1>
      <p className="text-muted-foreground">Comparing versions for summary ID: {id}</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Version Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-md">
              <div>
                <h3 className="font-bold text-red-600">Previous Version</h3>
                <p className="text-sm">Total Candidates: 1,200</p>
              </div>
              <div>
                <h3 className="font-bold text-green-600">Current Version</h3>
                <p className="text-sm">Total Candidates: 1,245 (+45)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterSummaryVersion;