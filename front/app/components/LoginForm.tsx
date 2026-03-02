"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";



const schema = z.object({
    email: z.string().email({ message: "Email invalide" }),
    password: z.string().min(1, { message: "Le mot de passe est requis" }),
});

type Schema = z.infer<typeof schema>;


const LoginForm = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Schema>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: Schema) => {
      
        
        console.log(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-1/3 items-center justify-center">
            <div className="w-full">
                <input
                    type="email"
                    placeholder="Email"
                    {...register("email")}
                    className="w-full rounded px-3 py-2 h-10 bg-white flex items-center justify-center border border-gray-300"
                    aria-invalid={!!errors.email}
                    autoComplete="off"
                />
                {errors.email && (
                    <p className="mt-1 text-lg text-red-600 text-center" role="alert">
                        {errors.email.message}
                    </p>
                )}
            </div>
            <div className="w-full">
                <input
                    type="password"
                    placeholder="Mot de passe"
                    {...register("password")}
                    className="w-full rounded px-3 py-2 h-10 bg-white flex items-center justify-center border border-gray-300"
                    aria-invalid={!!errors.password}
                    autoComplete="off"
                />
                {errors.password && (
                    <p className="mt-1 text-lg text-red-600 text-center" role="alert">
                        {errors.password.message}
                    </p>
                )}
            </div>
            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 h-10 bg-orange-500 text-white hover:bg-orange-600 rounded-md text-2xl text-center"
            >
                {isSubmitting ? "Connexion..." : "Connexion"}
            </Button>
        </form>
    );
};

export default LoginForm;