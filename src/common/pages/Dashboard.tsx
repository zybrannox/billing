import Table from "../componets/Table";
import { Link } from "react-router-dom";
import ImageModel from "../componets/ImageModel";

const Dashboard = () => {
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
