import Table from "../componets/Table";
import { Link } from "react-router-dom";
import ImageModel from "../componets/ImageModel";
import { useProjectStore } from "../../store/useProjectStore";
import { useEffect } from "react";
import axios from "axios";

const Dashboard = () => {
  const setProjects = useProjectStore((state) => state.setProjects);

  useEffect(() => {
    // Fetch projects from backend
    const fetchProjects = async () => {
      try {
        const res = await axios.get("https://billing-server-84uz.onrender.com/projects/");
        setProjects(res.data); // update Zustand store
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    };

    fetchProjects();
  }, [setProjects]);
  return (
    <main>
       {/* <div className="max-w-6xl mx-auto"> */}
         <div className="flex justify-between items-center mb-6">
           <h1 className="text-2xl font-bold text-blue-700">Zybrannox Dashboard</h1>
           <Link
             to="/add"
             className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
           >
             + Add Project
           </Link>
         </div>
      <Table />
      <ImageModel />
    </main>
  );
};

export default Dashboard;
