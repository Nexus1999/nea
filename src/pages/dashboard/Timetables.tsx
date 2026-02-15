import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Timetables = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Timetables</h2>
      <Card>
        <CardHeader>
          <CardTitle>Examination Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Manage and view all examination timetables here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Timetables;