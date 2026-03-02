"use client";

import React from "react";
import { useParams } from "react-router-dom";

const MasterSummaryOverview = () => {
  const { id } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Master Summary Overview</h1>
      <p className="text-muted-foreground">Displaying overview data for summary ID: {id}</p>
      <div className="mt-6 p-8 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
        Overview Content Placeholder
      </div>
    </div>
  );
};

export default MasterSummaryOverview;