import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../models/api.model';
import {
  ApplicationDetail,
  ApplicationDraftPayload,
  ApplicationQuery,
  ApplicationSummary,
  AssignPayload,
  DashboardStats,
  ReviewPayload,
} from '../models/application.model';
import { ReviewerOption } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  private readonly http = inject(HttpClient);

  getApplications(query: ApplicationQuery): Observable<PageResult<ApplicationSummary>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize)
      .set('sort', query.sort);

    if (query.search.trim()) {
      params = params.set('search', query.search.trim());
    }

    if (query.status) {
      params = params.set('status', query.status);
    }

    if (query.riskLevel) {
      params = params.set('riskLevel', query.riskLevel);
    }

    return this.http.get<PageResult<ApplicationSummary>>('/api/applications', { params });
  }

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('/api/applications/stats');
  }

  getApplication(applicationId: string, revealSensitive = false): Observable<ApplicationDetail> {
    let params = new HttpParams();

    if (revealSensitive) {
      params = params.set('revealSensitive', 'true');
    }

    return this.http.get<ApplicationDetail>(
      `/api/applications/${encodeURIComponent(applicationId)}`,
      { params },
    );
  }

  createApplication(): Observable<ApplicationDetail> {
    return this.http.post<ApplicationDetail>('/api/applications', {});
  }

  saveDraft(
    applicationId: string,
    payload: ApplicationDraftPayload,
  ): Observable<{ savedAt: string }> {
    return this.http.patch<{ savedAt: string }>(
      `/api/applications/${encodeURIComponent(applicationId)}/draft`,
      payload,
    );
  }

  submitApplication(applicationId: string): Observable<ApplicationDetail> {
    return this.http.post<ApplicationDetail>(
      `/api/applications/${encodeURIComponent(applicationId)}/submit`,
      {},
    );
  }

  reviewApplication(
    applicationId: string,
    payload: ReviewPayload,
  ): Observable<ApplicationDetail> {
    return this.http.post<ApplicationDetail>(
      `/api/applications/${encodeURIComponent(applicationId)}/review`,
      payload,
    );
  }

  assignApplication(applicationId: string, payload: AssignPayload): Observable<ApplicationDetail> {
    return this.http.patch<ApplicationDetail>(
      `/api/applications/${encodeURIComponent(applicationId)}/assign`,
      payload,
    );
  }

  getReviewers(): Observable<ReviewerOption[]> {
    return this.http.get<ReviewerOption[]>('/api/reviewers');
  }
}
