import Swal, { SweetAlertOptions } from 'sweetalert2';

export const showStyledSwal = (options: SweetAlertOptions) => {
  return Swal.fire({
    ...options,
    customClass: {
      confirmButton: 'bg-primary text-primary-foreground px-4 py-2 rounded-md',
      cancelButton: 'bg-destructive text-destructive-foreground px-4 py-2 rounded-md',
    },
    buttonsStyling: false,
  });
};