import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import axios from "axios";

const AddProject = () => {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("assignee", data.assignee);
      formData.append("start", data.start);
      formData.append("delivery", data.delivery);
      formData.append("status", data.status);
      formData.append("priority", data.priority);
      formData.append("description", data.description);
      formData.append("client_status", data.client_status);

      for (let i = 0; i < data.images.length; i++) {
        formData.append("images", data.images[i]);
      }

      await axios.post("http://localhost:8000/projects/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-xl bg-white p-8 rounded-xl shadow-md space-y-5"
      >
        <h2 className="text-2xl font-semibold text-gray-800 text-center">
          Add New Project
        </h2>

        <input
          {...register("name")}
          required
          placeholder="Project Name"
          className="input-style"
        />

        <input
          {...register("assignee")}
          required
          placeholder="Assigned To"
          className="input-style"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Start Date</label>
            <input
              {...register("start")}
              required
              type="date"
              className="input-style"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Delivery Date</label>
            <input
              {...register("delivery")}
              required
              type="date"
              className="input-style"
            />
          </div>
        </div>

        <textarea
          {...register("description")}
          required
          placeholder="Description"
          className="input-style min-h-[100px]"
        />

        <select {...register("priority")} required className="input-style">
          <option value="">Select Priority</option>
          <option>Low</option>
          <option>Normal</option>
          <option>High</option>
          <option>Urgent</option>
        </select>

        <input
          {...register("client_status")}
          required
          placeholder="Client Status"
          className="input-style"
        />

        <input
          {...register("status")}
          required
          placeholder="Project Status"
          className="input-style"
        />

        <div>
          <label className="text-sm text-gray-600">Upload Images</label>
          <input
            type="file"
            {...register("images")}
            multiple
            className="input-style py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-900 transition"
        >
          Add Project
        </button>
      </form>
    </div>
  );
};

export default AddProject;
