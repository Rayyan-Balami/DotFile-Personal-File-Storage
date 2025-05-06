import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { registerUserSchema, RegisterUserInput } from "@/validation/authForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useRegister } from "@/api/user/user.query";
import { toast } from "sonner";

export function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const navigate = useNavigate();
  const register = useRegister();

  const form = useForm<RegisterUserInput>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterUserInput) {
    try {
      await register.mutateAsync(values);
      toast.success("Registration successful! Please log in.");
      navigate({ to: "/login" });
    } catch (error: any) {
      const responseData = error.response?.data;
      const errorField = responseData?.errors?.[0];
      const message = responseData?.message || "Our servers are busy. Please try again later.";
      
      if (["email", "password", "name"].includes(errorField)) {
        form.setError(errorField, { type: "manual", message });
      } else {
        toast.error(message);
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-12", className)} {...props}>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Create a new account</h1>
        <p className="text-balance text-base text-muted-foreground">
          Enter your details below to create your account
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="gap-3">
                <FormLabel htmlFor="name">Name</FormLabel>
                <FormControl>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    disabled={form.formState.isSubmitting}
                    className="h-12"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="gap-3">
                <FormLabel htmlFor="email">Email</FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    disabled={form.formState.isSubmitting}
                    className="h-12"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="gap-3">
                <FormLabel htmlFor="password">Password</FormLabel>
                <FormControl>
                  <Input
                    id="password"
                    type="password"
                    disabled={form.formState.isSubmitting}
                    className="h-12"
                    placeholder="••••••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="gap-3">
                <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    id="confirmPassword"
                    type="password"
                    disabled={form.formState.isSubmitting}
                    className="h-12"
                    placeholder="••••••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            loading={form.formState.isSubmitting}
            className="w-full h-12 text-base [&>svg]:size-5!"
            disabled={form.formState.isSubmitting}
          >
            Sign Up
          </Button>
        </form>
      </Form>
      <div className="text-center text-base text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="underline underline-offset-4 hover:text-primary">
          Log in
        </Link>
      </div>
    </div>
  );
}

export default RegisterForm;
