import React from "react";
import AdminUploadsList from "./AdminUploadsList.jsx";

export default function AdminNewUploads() {
  return <AdminUploadsList title="New Uploads" source="json_import" backTo="/admin/import" backLabel="Import" />;
}
