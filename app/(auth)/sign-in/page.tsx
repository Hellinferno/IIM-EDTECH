import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignInPage(): Promise<JSX.Element> {
  const { userId } = await auth();
  if (userId) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <SignIn path="/sign-in" signUpUrl="/sign-up" />
        <p className="text-center text-sm text-foreground/80">
          Privacy notice: uploaded images are temporary and chat content is not persisted in this
          prototype.
        </p>
      </div>
    </main>
  );
}
