// utils/orderFlowManager.js
export const ORDER_STATES = {
  PENDING_SELLER: 'pending_seller',
  SELLER_ACCEPTED: 'seller_accepted',
  SELLER_REJECTED: 'seller_rejected',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_COMPLETED: 'payment_completed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED_BY_USER: 'cancelled_by_user',
  CANCELLED_BY_SELLER: 'cancelled_by_seller'
};

export const getStatusLabel = (status) => {
  const labels = {
    [ORDER_STATES.PENDING_SELLER]: 'Awaiting Restaurant',
    [ORDER_STATES.SELLER_ACCEPTED]: 'Restaurant Accepted',
    [ORDER_STATES.SELLER_REJECTED]: 'Declined by Restaurant',
    [ORDER_STATES.PAYMENT_PENDING]: 'Payment Pending',
    [ORDER_STATES.PAYMENT_COMPLETED]: 'Payment Completed',
    [ORDER_STATES.PREPARING]: 'Preparing',
    [ORDER_STATES.READY]: 'Ready',
    [ORDER_STATES.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [ORDER_STATES.DELIVERED]: 'Delivered',
    [ORDER_STATES.CANCELLED_BY_USER]: 'Cancelled by You',
    [ORDER_STATES.CANCELLED_BY_SELLER]: 'Cancelled by Restaurant'
  };
  return labels[status] || status;
};

export const canProceedToPayment = (orderState) => {
  return orderState === ORDER_STATES.SELLER_ACCEPTED;
};

export const canCancelOrder = (orderState) => {
  return [
    ORDER_STATES.PENDING_SELLER,
    ORDER_STATES.SELLER_ACCEPTED,
    ORDER_STATES.PREPARING
  ].includes(orderState);
};

export const isTerminalState = (orderState) => {
  return [
    ORDER_STATES.DELIVERED,
    ORDER_STATES.SELLER_REJECTED,
    ORDER_STATES.CANCELLED_BY_USER,
    ORDER_STATES.CANCELLED_BY_SELLER
  ].includes(orderState);
};

export default {
  ORDER_STATES,
  getStatusLabel,
  canProceedToPayment,
  canCancelOrder,
  isTerminalState
};