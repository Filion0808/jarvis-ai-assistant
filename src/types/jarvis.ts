export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  commands?: string[];
}

export interface SystemSpecs {
  os: string;
  de: string;
  displayServer: string;
  cpu: string;
  ram: string;
  gpu: string;
  pythonEnv: string;
  stack: string[];
  status: string;
}

export interface PythonModule {
  id: string;
  filename: string;
  category: 'core' | 'agents' | 'gpu' | 'voice' | 'config';
  description: string;
  code: string;
  dependencies: string[];
}

export interface PCAction {
  id: string;
  type: string; // e.g. 'open_terminal', 'system_monitor', 'file_manager', 'lock_screen', 'custom'
  label: string;
  command: string;
  description: string;
  category: 'apps' | 'system' | 'media' | 'monitoring';
  icon?: string;
}

export interface LocalBridgeStatus {
  online: boolean;
  checking: boolean;
  host: string;
  desktop?: string;
  terminal?: string;
  lastChecked?: number;
  lastExecutedCommand?: string;
  lastExecutionResult?: {
    success: boolean;
    message: string;
    pid?: number;
    error?: string;
  };
}

export interface TerminalSnippet {
  id: string;
  title: string;
  category: 'fedora' | 'kde' | 'python' | 'gpu' | 'logs';
  command: string;
  description: string;
  riskLevel: 'safe' | 'caution' | 'system';
  simulatedOutput?: string;
}

export interface GitHubSyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'info';
  message: string;
  commitHash?: string;
}

export interface GitHubSyncConfig {
  repoOwner: string;
  repoName: string;
  branch: string;
  token?: string;
  isPrivate: boolean;
  autoSync: boolean;
  lastSyncTime?: string;
  lastCommitMessage?: string;
}


