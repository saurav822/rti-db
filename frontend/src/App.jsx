import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Upload from "./pages/Upload.jsx";
import Search from "./pages/Search.jsx";
import RTIDetail from "./pages/RTIDetail.jsx";
import DuplicateChecker from "./pages/DuplicateChecker.jsx";
import Browse from "./pages/Browse.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="upload" element={<Upload />} />
          <Route path="search" element={<Search />} />
          <Route path="rti/:id" element={<RTIDetail />} />
          <Route path="check" element={<DuplicateChecker />} />
          <Route path="browse" element={<Browse />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
