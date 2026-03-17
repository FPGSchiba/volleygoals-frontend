import { IProgressReport } from './types';
import { create } from 'zustand';
import { IProgressReportFilterOption } from '../services/types';
import VolleyGoalsAPI from '../services/backend.api';
import { useNotificationStore } from './notification';
import i18next from 'i18next';

type ProgressReportState = {
  reportList: {
    reports: IProgressReport[];
    count: number;
    hasMore: boolean;
    nextToken: string;
    filter: IProgressReportFilterOption;
  };
  currentReport?: IProgressReport;
}

type ProgressReportActions = {
  fetchReports: (seasonId: string, filter: IProgressReportFilterOption) => Promise<void>;
  getReport: (seasonId: string, reportId: string) => Promise<IProgressReport | null>;
  createReport: (seasonId: string, summary: string, details: string, progress?: { goalId: string, rating: number, details?: string }[]) => Promise<IProgressReport | null>;
  updateReport: (seasonId: string, reportId: string, data: Partial<{ summary: string, details: string, progress: { goalId: string, rating: number, details?: string }[] }>) => Promise<void>;
  deleteReport: (seasonId: string, reportId: string) => Promise<void>;
}

const useProgressReportStore = create<ProgressReportState & ProgressReportActions>((set) => ({
  reportList: {
    reports: [],
    count: 0,
    hasMore: false,
    nextToken: '',
    filter: {}
  },
  currentReport: undefined,
  fetchReports: async (seasonId: string, filter: IProgressReportFilterOption) => {
    const response = await VolleyGoalsAPI.listProgressReports(seasonId, filter);
    if (response.items) {
      set(() => ({
        reportList: {
          reports: response.items!,
          count: response.count || response.items!.length,
          hasMore: !!response.hasMore,
          nextToken: response.nextToken || '',
          filter: filter
        }
      }));
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while fetching progress reports.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
    }
  },
  getReport: async (seasonId: string, reportId: string) => {
    const response = await VolleyGoalsAPI.getProgressReport(seasonId, reportId);
    if (response.progressReport) {
      set(() => ({ currentReport: response.progressReport }));
      return response.progressReport!;
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while fetching the progress report.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
      return null;
    }
  },
  createReport: async (seasonId: string, summary: string, details: string, progress?: { goalId: string, rating: number, details?: string }[]) => {
    const response = await VolleyGoalsAPI.createProgressReport(seasonId, { summary, details, progress });
    if (response.progressReport) {
      set((state) => ({
        reportList: {
          reports: [response.progressReport!, ...state.reportList.reports],
          count: state.reportList.count + 1,
          hasMore: state.reportList.hasMore,
          nextToken: state.reportList.nextToken,
          filter: state.reportList.filter
        },
        currentReport: response.progressReport
      }));
      return response.progressReport!;
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while creating the progress report.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
      return null;
    }
  },
  updateReport: async (seasonId: string, reportId: string, data: Partial<{ summary: string, details: string, progress: { goalId: string, rating: number, details?: string }[] }>) => {
    const response = await VolleyGoalsAPI.updateProgressReport(seasonId, reportId, data);
    if (response.progressReport) {
      set((state) => ({
        reportList: {
          reports: state.reportList.reports.map(r => r.id === reportId ? response.progressReport! : r),
          count: state.reportList.count,
          hasMore: state.reportList.hasMore,
          nextToken: state.reportList.nextToken,
          filter: state.reportList.filter
        },
        currentReport: response.progressReport
      }));
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while updating the progress report.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
    }
  },
  deleteReport: async (seasonId: string, reportId: string) => {
    const response = await VolleyGoalsAPI.deleteProgressReport(seasonId, reportId);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while deleting the progress report.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
    } else {
      set((state) => ({
        reportList: {
          reports: state.reportList.reports.filter(r => r.id !== reportId),
          count: state.reportList.count - 1,
          hasMore: state.reportList.hasMore,
          nextToken: state.reportList.nextToken,
          filter: state.reportList.filter
        }
      }));
    }
  }
}));

export { useProgressReportStore };
