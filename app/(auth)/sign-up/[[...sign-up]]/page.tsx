import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage(): Promise<JSX.Element> {
    const { userId } = await auth();
    if (userId) {
        redirect("/");
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4">
                <SignUp path="/sign-up" signInUrl="/sign-in" />
                <p className="text-center text-sm text-foreground/80">
                    Privacy notice: uploaded images are deleted after a short retention window for prototype
                    testing.
                </p>
            </div>
        </main>
    );
}
