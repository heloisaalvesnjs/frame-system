import type { ReactNode } from "react";
import {
	LayoutGridIcon,
	MessageSquareTextIcon,
	CalendarDaysIcon,
	ClockIcon,
	UsersIcon,
	BotIcon,
	SettingsIcon,
	PlugIcon,
	HelpCircleIcon,
	ActivityIcon,
} from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

// Navegação real do Frame System — cada aba mapeia para um recurso que já existe
// na Frame API (e portanto no Supabase que o n8n lê ao vivo).
export const navGroups: SidebarNavGroup[] = [
	{
		items: [
			{
				title: "Visão geral",
				path: "/",
				icon: <LayoutGridIcon />,
			},
		],
	},
	{
		label: "Operação",
		items: [
			{
				title: "Atendimento",
				path: "/atendimento",
				icon: <MessageSquareTextIcon />,
			},
			{
				title: "Agenda",
				path: "/agenda",
				icon: <CalendarDaysIcon />,
			},
			{
				title: "Disponibilidade",
				path: "/disponibilidade",
				icon: <ClockIcon />,
			},
			{
				title: "Pacientes",
				path: "/pacientes",
				icon: <UsersIcon />,
			},
		],
	},
	{
		label: "Inteligência",
		items: [
			{
				title: "Assistente (IA)",
				path: "/assistente",
				icon: <BotIcon />,
			},
		],
	},
	{
		label: "Conta",
		items: [
			{
				title: "Integrações",
				path: "/integracoes",
				icon: <PlugIcon />,
			},
			{
				title: "Configurações",
				path: "/configuracoes",
				icon: <SettingsIcon />,
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Ajuda",
		path: "/ajuda",
		icon: <HelpCircleIcon />,
	},
	{
		title: "Status do sistema",
		path: "/status",
		icon: <ActivityIcon />,
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
