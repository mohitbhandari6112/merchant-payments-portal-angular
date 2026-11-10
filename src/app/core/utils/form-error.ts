import { AbstractControl, ValidationErrors } from '@angular/forms';

export function controlError(control: AbstractControl | null): string | null {
  if (!control || control.valid || (!control.touched && !control.dirty)) {
    return null;
  }

  return errorMessage(control.errors);
}

export function errorMessage(errors: ValidationErrors | null): string | null {
  if (!errors) {
    return null;
  }

  if (errors['required'] || errors['trimmedRequired']) {
    return 'This field is required.';
  }

  if (errors['requiredTrue']) {
    return 'You must accept the terms before submitting.';
  }

  if (errors['email']) {
    return 'Enter a valid email address.';
  }

  if (errors['minlength']) {
    return `Enter at least ${errors['minlength'].requiredLength} characters.`;
  }

  if (errors['maxlength']) {
    return `Enter no more than ${errors['maxlength'].requiredLength} characters.`;
  }

  if (errors['min']) {
    return `Enter a value of at least ${errors['min'].min}.`;
  }

  if (errors['max']) {
    return `Enter a value no greater than ${errors['max'].max}.`;
  }

  if (errors['phone']) {
    return 'Enter a valid phone number with 7–20 digits.';
  }

  if (errors['registrationNumber']) {
    return 'Use 5–20 letters, numbers, or dashes.';
  }

  if (errors['taxId']) {
    return 'Use 6–20 letters, numbers, or dashes.';
  }

  if (errors['bankAccount']) {
    return 'Enter an 8–34 digit bank account number.';
  }

  if (errors['postalCode']) {
    return 'Enter a valid postal code.';
  }

  if (errors['website']) {
    return 'Enter a valid website address.';
  }

  if (errors['noWhitespace']) {
    return 'This value cannot contain spaces.';
  }

  if (errors['pattern']) {
    return 'Enter a valid value.';
  }

  return 'This value is not valid.';
}
