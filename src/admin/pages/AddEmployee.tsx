import CustomForm from "../../common/componets/CustomForm";
import { addEmployeeFields } from "../../config/admin";
import { useApiRequest } from "../../hooks/useApiRequest";

export default function AddEmployee() {
  const { sendRequest, loading } = useApiRequest();

  const handleSubmit = async (formData) => {
    console.log(formData);
    
    await sendRequest({
      endpoint: "/users/",
      method: "post",
      data: formData,
      onSuccess: (res) => {
        // toast.success("Employee added");
      },
      onError: (err) => {
        console.log("Error", err);
        // toast.error(err.message || "Error adding employee");
      },
      redirectTo: "/admin/employees", // optional redirect
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Add Employee</h2>

      <CustomForm
        fields={addEmployeeFields}
        onSubmit={handleSubmit}   // handler
        buttonName={loading ? "Submitting..." : "Add Employee"}
      />
    </div>
  );
}
