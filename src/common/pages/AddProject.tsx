import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../../store/useProjectStore";

const AddProject = () => {
  const navigate = useNavigate();
  const { addProject } = useProjectStore();

  const { register, handleSubmit } = useForm();

  function onSubmit(data: any) {
    const files = data.images as FileList;
const images = Array.from(files).map((file) =>
  URL.createObjectURL(file)
);

    const newProject = {
      id: `P-${Math.floor(Math.random() * 9000) + 1000}`,
      name: data.name,
      assignee: data.assignee,
      delivery: data.delivery,
      priority: data.priority,
      clientStatus: data.client_status,
      description: data.description,
      started: data.started,
      status: data.status,
      images,
    };

    addProject(newProject);
    navigate("/");
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 flex flex-col items-center">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">Add New Project</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white text-black p-6 rounded-lg shadow grid grid-cols-2 gap-3 w-[600px]"
      >
        <input {...register("name")} className="border border-black p-2 rounded" required placeholder="Project Name" />
        <input {...register("assignee")} className="border border-black p-2 rounded" required placeholder="Assigned To" />

        <input type="date" {...register("delivery")} className="border border-black p-2 rounded" required />

        <select {...register("priority")} className="border border-black p-2 rounded">
          <option>Low</option>
          <option>Normal</option>
          <option>High</option>
          <option>Urgent</option>
        </select>

        <select {...register("client_status")} className="border border-black p-2 rounded">
          <option>Accepted</option>
          <option>Rejected</option>
          <option>Holded</option>
        </select>

        <textarea
          {...register("description")}
          placeholder="Client Description"
          className="border border-black p-2 rounded col-span-2"
        />

        <input type="date" {...register("started")} className="border border-black p-2 rounded" required />

        <select {...register("status")} className="border border-black p-2 rounded">
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>

        <input type="file" {...register("images")} multiple className="border border-black p-2 rounded col-span-2" />

        <button className="bg-blue-700 text-white py-2 rounded col-span-2">
          Add Project
        </button>
      </form>

      <button onClick={() => navigate("/")} className="mt-4 text-blue-600 underline">
        Back to Dashboard
      </button>
    </div>
  );
};

export default AddProject;
