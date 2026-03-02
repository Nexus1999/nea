"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Users, FileText, AlertCircle } from "lucide-react";

const Dashboard = () => {
  const stats = [
    { title: "Total Summaries", value: "124", icon: <Database className="h-5 w-5 text-blue-500" /> },
    { title: "Active Users", value: "42", icon: <Users className="h-5 w-5 text-green-500" /> },
    { title: "Pending Reports", value: "12", icon: <FileText className="h-5 w-5 text-orange-500" /> },
    { title: "System Alerts", value: "2", icon: <AlertCircle className="h-5 w-5 text-red-500" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;