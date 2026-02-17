export interface SalesStrategy {
  id: string;
  title: string;
  description: string;
  script: string;
  category: 'Call' | 'Email';
}

export interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
