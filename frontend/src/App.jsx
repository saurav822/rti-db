import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Upload from "./pages/Upload.jsx";
import Search from "./pages/Search.jsx";
import RTIDetail from "./pages/RTIDetail.jsx";
import DuplicateChecker from "./pages/DuplicateChecker.jsx";
import Browse from "./pages/Browse.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import Departments from "./pages/Departments.jsx";
import About from "./pages/About.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { LanguageProvider } from "./contexts/LanguageContext.jsx";

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="upload" element={<Upload />} />
              <Route path="search" element={<Search />} />
              <Route path="rti/:id" element={<RTIDetail />} />
              <Route path="check" element={<DuplicateChecker />} />
              <Route path="browse" element={<Browse />} />
              <Route path="login" element={<Login />} />
              <Route path="profile" element={<Profile />} />
              <Route path="departments" element={<Departments />} />
              <Route path="about" element={<About />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
