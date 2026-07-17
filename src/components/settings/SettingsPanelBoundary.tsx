"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";

import { SettingsSection } from "./SettingsSection";

const LOG_SOURCE = "SettingsPanelBoundary";

interface SettingsPanelBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface SettingsPanelBoundaryState {
  hasError: boolean;
}

export class SettingsPanelBoundary extends Component<
  SettingsPanelBoundaryProps,
  SettingsPanelBoundaryState
> {
  state: SettingsPanelBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SettingsPanelBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(
      "Settings panel failed to render",
      {
        error: error.message,
        componentStack: errorInfo.componentStack ?? null,
      },
      LOG_SOURCE
    );
  }

  componentDidUpdate(previousProps: SettingsPanelBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SettingsSection
        title="This section could not load"
        description="Your other settings are still available. Try again, or choose another section in the sidebar."
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => this.setState({ hasError: false })}
        >
          Try again
        </Button>
      </SettingsSection>
    );
  }
}
