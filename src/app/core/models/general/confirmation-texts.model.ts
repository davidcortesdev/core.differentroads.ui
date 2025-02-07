export interface State {
  title: string;
  text: string;
}

export interface CheckoutSection {
  'success-state': State;
  'error-state': State;
  'transfer-state': State;
  'rq-state': State;
}
