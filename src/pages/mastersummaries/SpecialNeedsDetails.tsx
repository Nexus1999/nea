"use client";

import React from "react";
import { useParams } from "react-router-dom";

const SpecialNeedsDetails = () => {
  const { id, code } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Special Needs Details: {code}</h1>
      <p className="text-muted-foreground">Detailed view for summary #{id}, category {code}.</p>
      <div className="mt-6 p-8 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
        Special Needs Data Placeholder
      </div>
    </div>
  );
};

export default SpecialNeedsDetails;