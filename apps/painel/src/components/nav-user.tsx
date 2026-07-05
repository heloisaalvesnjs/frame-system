"use client";

import { useRouter } from "next/navigation";
import {
	Avatar,
	AvatarFallback,
} from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserIcon, SettingsIcon, LogOutIcon } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { clearSession } from "@/lib/api";

export function NavUser() {
	const router = useRouter();
	const { user } = useAuth();
	const name = user?.name ?? "Nutricionista";
	const email = user?.email ?? "";
	const initial = name.charAt(0).toUpperCase();

	function handleLogout() {
		clearSession();
		router.replace("/login");
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar className="size-8 cursor-pointer">
					<AvatarFallback className="bg-primary text-primary-foreground">
						{initial}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuItem className="flex items-center justify-start gap-2">
					<DropdownMenuLabel className="flex items-center gap-3">
						<Avatar className="size-10">
							<AvatarFallback className="bg-primary text-primary-foreground">
								{initial}
							</AvatarFallback>
						</Avatar>
						<div>
							<span className="font-medium text-foreground">{name}</span>
							<br />
							<div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
								{email}
							</div>
						</div>
					</DropdownMenuLabel>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<a href="/configuracoes">
							<UserIcon />
							Meu perfil
						</a>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<a href="/configuracoes">
							<SettingsIcon />
							Configurações
						</a>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer"
						variant="destructive"
						onClick={handleLogout}
					>
						<LogOutIcon />
						Sair
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
