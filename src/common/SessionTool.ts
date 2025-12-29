import * as vscode from 'vscode';
import * as ui from './UI';
import { Session } from './Session';
import { BaseTool, BaseToolInput } from './BaseTool';
import { AIHandler } from '../chat/AIHandler';

type SessionCommand = 'GetSession' | 'SetSession' | 'ListProfiles' | 'RefreshCredentials';

// Input interface
interface SessionToolInput extends BaseToolInput {
  command: SessionCommand;
  params: SessionParams;
}

interface SessionParams {
  AwsProfile?: string;
  AwsEndPoint?: string;
  AwsRegion?: string;
}

export class SessionTool extends BaseTool<SessionToolInput> {
  protected readonly toolName = 'SessionTool';

  protected updateResourceContext(command: string, params: Record<string, any>): void {
    // Session tool primarily updates global session, not specific resource context
  }

  protected async executeCommand(command: SessionCommand, params: Record<string, any>): Promise<any> {
    switch (command) {
      case 'GetSession':
        return this.getSession();
      case 'SetSession':
        return this.setSession(params as SessionParams);
      case 'ListProfiles':
        return this.listProfiles();
      case 'RefreshCredentials':
        return this.refreshCredentials();
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }

  private getSession() {
    if (!Session.Current) {
      throw new Error('Session not initialized');
    }
    return {
      AwsProfile: Session.Current.AwsProfile,
      AwsEndPoint: Session.Current.AwsEndPoint,
      AwsRegion: Session.Current.AwsRegion,
    };
  }

  private setSession(params: SessionParams) {
    if (!Session.Current) {
      throw new Error('Session not initialized');
    }

    if (params.AwsProfile !== undefined) {
      Session.Current.AwsProfile = params.AwsProfile || 'default';
    }
    if (params.AwsEndPoint !== undefined) {
      Session.Current.AwsEndPoint = params.AwsEndPoint || undefined;
    }
    if (params.AwsRegion !== undefined) {
      Session.Current.AwsRegion = params.AwsRegion || 'us-east-1';
    }

    Session.Current.SaveState();
    Session.Current.ClearCredentials();

    return this.getSession();
  }

  private listProfiles() {
    
  }

  private async refreshCredentials() {
    if (!Session.Current) {
      throw new Error('Session not initialized');
    }
    Session.Current.RefreshCredentials();
    return { ok: true };
  }
}
