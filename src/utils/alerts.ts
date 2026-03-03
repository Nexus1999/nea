import Swal from 'sweetalert2';

export const showStyledSwal = ({
  title,
  html,
  icon,
  showCancelButton,
  confirmButtonText,
  cancelButtonText,
  reverseButtons,
}: any) => {
  return Swal.fire({
    title,
    html,
    icon,
    showCancelButton,
    confirmButtonText,
    cancelButtonText,
    reverseButtons,
    customClass: {
      confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md',
      cancelButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md ml-2'
    },
    buttonsStyling: false
  });
};