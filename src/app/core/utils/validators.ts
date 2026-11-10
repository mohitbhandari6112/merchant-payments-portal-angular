import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{7,22}$/;
const REGISTRATION_PATTERN = /^[A-Za-z0-9-]{5,20}$/;
const TAX_ID_PATTERN = /^[A-Za-z0-9-]{6,20}$/;
const BANK_ACCOUNT_PATTERN = /^\d{8,34}$/;
const POSTAL_PATTERN = /^[A-Za-z0-9 -]{3,10}$/;
const WEBSITE_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/[\w\-./?%&=#]*)?$/i;

export function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.trim().length === 0) {
    return { required: true };
  }

  return null;
}

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return EMAIL_PATTERN.test(value.trim()) ? null : { email: true };
}

export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return PHONE_PATTERN.test(value.trim()) ? null : { phone: true };
}

export function registrationNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return REGISTRATION_PATTERN.test(value.trim()) ? null : { registrationNumber: true };
}

export function taxIdValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return TAX_ID_PATTERN.test(value.trim()) ? null : { taxId: true };
}

export function bankAccountValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return BANK_ACCOUNT_PATTERN.test(value.trim()) ? null : { bankAccount: true };
}

export function postalCodeValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return POSTAL_PATTERN.test(value.trim()) ? null : { postalCode: true };
}

export function websiteValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return WEBSITE_PATTERN.test(value.trim()) ? null : { website: true };
}

export function averageTicketWithinVolume(group: AbstractControl): ValidationErrors | null {
  const monthlyVolume = Number(group.get('monthlyVolume')?.value);
  const averageTicket = Number(group.get('averageTicket')?.value);

  if (!Number.isFinite(monthlyVolume) || !Number.isFinite(averageTicket)) {
    return null;
  }

  if (monthlyVolume > 0 && averageTicket > monthlyVolume) {
    return { averageTicketTooHigh: true };
  }

  return null;
}

export function noWhitespace(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value === 'string' && /\s/.test(value)) {
    return { noWhitespace: true };
  }

  return null;
}

export function asValidator(validator: ValidatorFn): ValidatorFn {
  return validator;
}
