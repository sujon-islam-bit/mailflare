"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import type { LicenseStatus } from "@/lib/licenses/types";
import { loadLicenseIndicatorStatus } from "./license-indicator-utils";
import { LICENSE_STATUS_CHANGED_EVENT } from "@/lib/licenses/constants";

export function LicenseIndicator() {
	const { t } = useLanguage();
	const [license, setLicense] = useState<LicenseStatus | null>(null);

	useEffect(() => {
		let cancelled = false;

		function load() {
			void loadLicenseIndicatorStatus().then((nextLicense) => {
				if (!cancelled) setLicense(nextLicense);
			});
		}

		load();
		window.addEventListener(LICENSE_STATUS_CHANGED_EVENT, load);
		return () => {
			cancelled = true;
			window.removeEventListener(LICENSE_STATUS_CHANGED_EVENT, load);
		};
	}, []);

	// Self-hosted personal install: no upgrade prompts anywhere.
	return null;
}
