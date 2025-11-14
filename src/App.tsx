import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import Dashboard from './common/pages/Dashboard';
import AddProject from './common/pages/AddProject';

function App() {

  return (
    <Router>
       <Routes>
        <Route
          path="/"
          element={<Dashboard />} //projects={projects} setSelectedProject={setSelectedProject} 
        />
        <Route path="/add" element={<AddProject />} />
      </Routes>
      {/* {selectedProject && (
        <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )} */}
    </Router>
  )
}

export default App

// import React, { useState } from "react";

// function daysUntil(dateStr) {
//   const now = new Date();
//   const d = new Date(dateStr + "T23:59:59");
//   const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
//   return diff;
// }

// function PriorityPill({ priority }) {
//   const map = {
//     Urgent: "bg-red-100 text-red-800",
//     High: "bg-yellow-100 text-yellow-800",
//     Normal: "bg-green-100 text-green-800",
//     Low: "bg-gray-100 text-gray-800",
//   };
//   return (
//     <span className={`text-xs font-semibold px-2 py-1 rounded-full ${map[priority] || map.Normal}`}>
//       {priority}
//     </span>
//   );
// }
