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
import { cn, logger } from "@/lib/utils";
import { loginUserSchema, LoginUserInput } from "@/validation/authForm";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useLogin } from "@/api/user/user.query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const navigate = useNavigate();
  const login = useLogin();
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<LoginUserInput>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginUserInput) {
    try {
      const response = await login.mutateAsync(values);

      // Extract user and token from the response
      const { user, accessToken } = response.data;
      console.log("Login response:", response);
      console.log("User data:", user);
      console.log("Access token:", accessToken);

      // Store in Zustand
      setAuth(user, accessToken);

      //log what is in the store
      console.log("Zustand store:", useAuthStore.getState());

      toast.success("Login successful!");
      navigate({ to: "/" }); // Navigate to home or dashboard
    } catch (error: any) {
      logger.error("Login error:", error);
      if (error.code === "ECONNABORTED") {
        toast.error("Login failed due to a timeout. Please try again.");
      } else {
        toast.error("Login failed. Please check your credentials.");
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-12", className)} {...props}>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-balance text-base text-muted-foreground">
          Enter your email below to login to your account
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="gap-3">
                <div className="flex items-center">
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <Link
                    to="/"
                    className="ml-auto text-xs underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
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
          <Button
            type="submit"
            loading={form.formState.isSubmitting}
            className="w-full h-12 text-base [&>svg]:size-5!"
            disabled={form.formState.isSubmitting}
          >
            Login
          </Button>
        </form>
      </Form>
      <div className="text-center text-base text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="underline underline-offset-4 hover:text-primary">
          Sign Up
        </Link>
      </div>
    </div>
  );
}

export default LoginForm;
