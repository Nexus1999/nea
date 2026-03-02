"use client";

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SpecialNeeds = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const needs = [
    { code: "BR", name: "Braille" },
    { code: "HI", name: "Hearing Impairment" },
    { code: "LV", name: "Low Vision" },
    { code: "PI", name: "Physical Impairment" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Special Needs - Summary #{id}</h1>
      
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {needs.map((need) => (
              <TableRow key={need.code}>
                <TableCell className="font-bold">{need.code}</TableCell>
                <TableCell>{need.name}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/dashboard/mastersummaries/special-needs/${id}/${need.code}/details`)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SpecialNeeds;