import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import axios from "axios";

const AddProject = () => {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    try {
      const imageFiles = data.images;

      if (!imageFiles || imageFiles.length === 0) {
        alert("Please upload at least 1 image.");
        return;
      }
      const imageUrls = await uploadImagesToCloudinary(imageFiles);

      const payload = {
        name: data.name,
        assignee: data.assignee,
        started: data.start,
        delivery: data.delivery,
        status: data.status,
        priority: data.priority,
        description: data.description,
        client_status: data.client_status,
        images: imageUrls,
      };
      console.log(payload);


      await axios.post("https://billing-server-84uz.onrender.com/projects/", payload);

      navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  const uploadImagesToCloudinary = async (files: FileList) => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      fd.append("upload_preset", "zybrannox_billing");
      fd.append("api_key", "294858463417412");

      try {
        const res = await axios.post(
          "https://api.cloudinary.com/v1_1/du9hcdtn0/image/upload",
          fd
        );

        uploadedUrls.push(res.data.secure_url);
      } catch (error) {
        console.error("❌ Cloudinary upload error", error);
      }
    }

    return uploadedUrls;
  };



  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-2xl bg-white p-10 rounded-2xl shadow-lg space-y-6 border border-gray-200"
      >
        <h2 className="text-3xl font-semibold text-gray-900 text-center mb-4">
          Add New Project
        </h2>

        {/* Project Name */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Project Name</label>
          <input
            {...register("name")}
            required
            placeholder="Enter project name"
            className="input-style w-full bg-white text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
          />
        </div>

        {/* Assignee */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Assigned To</label>
          <input
            {...register("assignee")}
            required
            placeholder="Enter assignee name"
            className="input-style w-full bg-white text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Start Date</label>
            <input
              {...register("start")}
              required
              type="date"
              className="input-style w-full bg-white text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Delivery Date</label>
            <input
              {...register("delivery")}
              required
              type="date"
              className="input-style w-full bg-white text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            {...register("description")}
            required
            placeholder="Enter project description"
            className="input-style w-full min-h-[120px] bg-white text-black border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:outline-none"
          />
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Priority</label>
          <select
            {...register("priority")}
            required
            className="input-style w-full bg-white text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
          >
            <option value="">Select Priority</option>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </div>

        {/* Client Status */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Client Status</label>
          <input
            {...register("client_status")}
            required
            placeholder="Enter client status"
            className="input-style w-full bg-white text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
          />
        </div>

        {/* Project Status */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Project Status</label>
          <input
            {...register("status")}
            required
            placeholder="Enter project status"
            className="input-style w-full bg-white text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
          />
        </div>

        {/* File Upload */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Upload Images</label>
          <input
            type="file"
            {...register("images")}
            multiple
            className="input-style w-full bg-white text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-900 transition font-medium text-lg shadow-md"
        >
          Add Project
        </button>
      </form>
    </div>
  );
};

export default AddProject;
