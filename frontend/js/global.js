document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutLink');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

function handleLogout() {
  // Clear all items from local storage and sent user to home
    localStorage.clear();
    window.location.href = '/';
}


function showError(title = 'Error', message) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
    });
}

function showSuccessMessage(title = 'Success', message) {
    return Swal.fire({
        icon: 'success',
        title: title,
        text: message,
    });
}

function showWarning(title = 'Warning', message) {
    Swal.fire({
        icon: 'warning',
        title: title,
        text: message,
    });
}

function showInfo(title = 'Information', message) {
    Swal.fire({
        icon: 'info',
        title: title,
        text: message,
    });
}

function showConfirmation(title = 'Are you sure?', message, confirmCallback) {
    Swal.fire({
        icon: 'question',
        title: title,
        text: message,
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
    }).then((result) => {
        if (result.isConfirmed) {
            confirmCallback();
        }
    });
}

function showDeleteConfirmation(title = 'Are you sure?', message, confirmCallback) {
    Swal.fire({
        title: title,
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No',
    }).then((result) => {
        if (result.isConfirmed) {
            confirmCallback();
        }
    });
}

function showShortSuccess(title = 'Success') {
    Swal.fire({
        position: "top-end",
        icon: "success",
        title: title,
        showConfirmButton: false,
        timer: 1000
    });
}