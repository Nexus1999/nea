"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, FileDiff, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockSummaries = [
  { id: "51", name: "2024 Primary Examination Summary", status: "Completed", date: "2024-03-15" },
  { id: "52", name: "2024 Secondary Mock Summary", status: "Draft", date: "2024-03-10" },
];

const MasterSummaries = () => {
  const navigate = useNavigate();

  const handleViewDetails = (id: string) => {
    navigate(`/dashboard/mastersummaries/details/${id}`);
  };

  const handleDifferenceReport = (id: string) => {
    // Assuming difference report is the 'version' or 'overview' page
    // If it's a specific report, we might need a new route or logic here
    navigate(`/dashboard/mastersummaries/version/${id}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Master Summaries</h1>
        <Button>Create New Summary</Button>
      </div>

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockSummaries.map((summary) => (
              <TableRow key={summary.id}>
                <TableCell className="font-medium">{summary.name}</TableCell>
                <TableCell>{summary.status}</TableCell>
                <TableCell>{summary.date}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewDetails(summary.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDifferenceReport(summary.id)}>
                          <FileDiff className="mr-2 h-4 w-4" />
                          Difference Report
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/mastersummaries/overview/${summary.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Overview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/mastersummaries/special-needs/${summary.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Special Needs
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MasterSummaries;