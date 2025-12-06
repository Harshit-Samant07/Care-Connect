import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../state/auth";
import { useNavigate } from "react-router-dom";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    isNgo: z.boolean(),
    orgName: z.string().min(2, "Organization name is required").optional(),
    regNo: z.string().min(3, "Registration number is required").optional(),
    address: z.string().min(5, "Address is required").optional(),
    website: z.union([z.string().url("Enter a valid URL"), z.literal("")]).optional(),
    contact: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isNgo) {
      if (!data.orgName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Organization name is required", path: ["orgName"] });
      if (!data.regNo) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Registration number is required", path: ["regNo"] });
      if (!data.address) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Address is required", path: ["address"] });
    }
  });

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { isNgo: false } });

  const isNgo = watch("isNgo");

  useEffect(() => {
    reset({
      email: "",
      password: "",
      isNgo: false,
    });
  }, [mode, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setAuthError(null);
    try {
      if (mode === "login") {
        await login(values.email, values.password);
      } else if (values.isNgo) {
        await signup({
          email: values.email,
          password: values.password,
          name: values.name,
          isNgo: true,
          ngo: {
            orgName: values.orgName!,
            regNo: values.regNo!,
            address: values.address!,
            website: values.website,
            contact: values.contact,
          },
        });
      } else {
        await signup({ email: values.email, password: values.password, name: values.name, isNgo: false });
      }
      nav("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setAuthError(message);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl card p-6 lg:p-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full px-4 py-2 ${mode === "login" ? "bg-primary text-white" : "bg-gray-100"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-full px-4 py-2 ${mode === "signup" ? "bg-primary text-white" : "bg-gray-100"}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-sm font-medium">Full name</label>
                <input {...register("name")} className="mt-1 form-input" placeholder="AV Patel" />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message as string}</p>}
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                <input id="isNgo" type="checkbox" {...register("isNgo")} className="h-4 w-4" />
                <label htmlFor="isNgo" className="text-sm">I represent an NGO / student club</label>
              </div>

              {isNgo && (
                <div className="space-y-3 rounded-2xl bg-slate-50/80 border border-gray-200 p-4">
                  <div className="grid gap-3">
                    <div>
                      <label className="block text-sm font-medium">Organization name</label>
                      <input {...register("orgName")} className="mt-1 form-input" />
                      {errors.orgName && <p className="text-red-600 text-sm mt-1">{errors.orgName.message as string}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Registration number</label>
                      <input {...register("regNo")} className="mt-1 form-input" />
                      {errors.regNo && <p className="text-red-600 text-sm mt-1">{errors.regNo.message as string}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Registered address</label>
                      <textarea {...register("address")} rows={3} className="mt-1 form-input" />
                      {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address.message as string}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium">Website (optional)</label>
                        <input {...register("website")} className="mt-1 form-input" placeholder="https://example.org" />
                        {errors.website && <p className="text-red-600 text-sm mt-1">{errors.website.message as string}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Contact number (optional)</label>
                        <input {...register("contact")} className="mt-1 form-input" placeholder="+91-xxxxxxxxxx" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" {...register("email")} className="mt-1 form-input" placeholder="you@college.edu" />
            {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input type="password" {...register("password")} className="mt-1 form-input" placeholder="•••••••" />
            {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
          </div>

          <button disabled={isSubmitting} className="btn btn-primary w-full">
            {mode === "login" ? "Login" : "Sign up"}
          </button>

          {authError && (
            <p className="text-sm text-center text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {authError}
            </p>
          )}

          <p className="text-sm text-center text-gray-500">
            {mode === "login" ? "New here?" : "Already joined?"}{" "}
            <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-semibold">
              {mode === "login" ? "Create an account" : "Login"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
