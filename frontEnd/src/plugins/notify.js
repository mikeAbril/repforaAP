import { reactive } from 'vue';

export const notificationState = reactive({
  show: false,
  message: '',
  type: 'success'
});

export const notify = (message, type = 'success') => {
  notificationState.message = message;
  notificationState.type = type;
  notificationState.show = true;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notificationState.show = false;
  }, 5000);
};

export const hideNotification = () => {
  notificationState.show = false;
};
