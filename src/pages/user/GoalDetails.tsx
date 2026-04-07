import React, { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Controller, useForm } from "react-hook-form";
import { useGoalStore } from "../../store/goals";
import { useSeasonStore } from "../../store/seasons";
import { useCognitoUserStore } from "../../store/cognitoUser";
import { usePermission } from "../../hooks/usePermission";
import { useTeamStore } from "../../store/teams";
import { CommentType, GoalStatus, GoalType, IGoal } from "../../store/types";
import { CommentSection } from "../../components/CommentSection";
import { UserDisplay } from "../../components/UserDisplay";
import i18next from "i18next";

type EditForm = { title: string; description: string; status: GoalStatus | ""; ownerId: string };

export function GoalDetails() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();

  const currentGoal = useGoalStore((s) => s.currentGoal);
  const getGoal = useGoalStore((s) => s.getGoal);
  const updateGoal = useGoalStore((s) => s.updateGoal);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const fetchGoalSeasons = useGoalStore((s) => s.fetchGoalSeasons);
  const goalSeasons = useGoalStore((s) => s.goalSeasons);
  const tagGoalToSeason = useGoalStore((s) => s.tagGoalToSeason);
  const untagGoalFromSeason = useGoalStore((s) => s.untagGoalFromSeason);

  const seasons = useSeasonStore((s) => s.seasonList.seasons);
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const getTeam = useTeamStore((s) => s.getTeam);
  const currentTeamSettings = useTeamStore((s) => s.currentTeamSettings);

  const teamId = selectedTeam?.team?.id || "";

  const canWriteTeam = usePermission("team_goals:write");
  const canWriteIndividual = usePermission("individual_goals:write");
  const canDeleteTeam = usePermission("team_goals:delete");
  const canDeleteIndividual = usePermission("individual_goals:delete");

  const canEditGoal = (g: IGoal) =>
    g.goalType === GoalType.Team ? canWriteTeam : canWriteIndividual;
  const canDeleteGoal = (g: IGoal) =>
    g.goalType === GoalType.Team ? canDeleteTeam : canDeleteIndividual;

  React.useEffect(() => {
    if (teamId) fetchSeasons(teamId, { teamId });
  }, [teamId]);

  React.useEffect(() => {
    if (goalId && teamId) {
      getGoal(teamId, goalId);
      fetchGoalSeasons(teamId, goalId);
    }
  }, [goalId, teamId]);

  React.useEffect(() => {
    if (teamId) getTeam(teamId).catch(() => {});
  }, [teamId]);

  const canModify = currentGoal ? canEditGoal(currentGoal) : false;
  const canDelete = currentGoal ? canDeleteGoal(currentGoal) : false;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<EditForm>({
    defaultValues: { title: "", description: "", status: "", ownerId: "" },
  });

  React.useEffect(() => {
    if (!currentGoal) return;
    reset({
      title: currentGoal.title,
      description: currentGoal.description,
      status: currentGoal.status,
      ownerId: currentGoal.ownerId,
    });
  }, [currentGoal, reset]);

  const onEdit = async (data: EditForm) => {
    if (!currentGoal || !teamId || !canModify) return;
    setActionLoading(true);
    try {
      await updateGoal(
        teamId,
        currentGoal.id,
        data.title || undefined,
        data.description || undefined,
        (data.status as GoalStatus) || undefined,
        data.ownerId || undefined,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async () => {
    if (!currentGoal || !teamId) return;
    setActionLoading(true);
    try {
      await deleteGoal(teamId, currentGoal.id);
      navigate("/goals");
    } finally {
      setActionLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handlePictureUpload = async (_file: File) => {
    // NOTE: uploadGoalAvatar API method not yet available; picture upload is a no-op
    setActionLoading(false);
  };

  if (!currentGoal) {
    return (
      <Paper>
        <Box p={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => navigate("/goals")} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">
              {i18next.t("goalDetails.title", "Goal Details")}
            </Typography>
          </Box>
          <Typography mt={2}>Loading...</Typography>
        </Box>
      </Paper>
    );
  }

  const settings = currentTeamSettings;
  const commentsEnabled =
    currentGoal.goalType === GoalType.Team
      ? (settings?.allowTeamGoalComments ?? false)
      : (settings?.allowIndividualGoalComments ?? false);

  return (
    <Paper className="goal-details-page">
      <Box p={2}>
        <Box className="goal-details-header" display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => navigate("/goals")} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">
            {i18next.t("goalDetails.title", "Goal Details")}
          </Typography>
        </Box>
        <Box mt={2}>
          <form id="goal-details-form" onSubmit={handleSubmit(onEdit)}>
            <Box display="flex" flexDirection="column" gap={2}>
              <Controller
                name="title"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label={i18next.t("user.goals.form.title", "Title")}
                    disabled={!canModify || actionLoading}
                    {...field}
                  />
                )}
              />

              <Box display="flex" gap={1}>
                <Chip label={currentGoal.goalType} />
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      size="small"
                      label={i18next.t("goalDetails.status", "Status")}
                      disabled={!canModify || actionLoading}
                      {...field}
                    >
                      <MenuItem value={GoalStatus.Open}>{i18next.t("user.goals.status.open", "Open")}</MenuItem>
                      <MenuItem value={GoalStatus.InProgress}>{i18next.t("user.goals.status.inProgress", "In Progress")}</MenuItem>
                      <MenuItem value={GoalStatus.Completed}>{i18next.t("user.goals.status.completed", "Completed")}</MenuItem>
                      <MenuItem value={GoalStatus.Archived}>{i18next.t("user.goals.status.archived", "Archived")}</MenuItem>
                    </TextField>
                  )}
                />
              </Box>

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label={i18next.t("user.goals.form.description", "Description")}
                    disabled={!canModify || actionLoading}
                    {...field}
                  />
                )}
              />

              <Box className="goal-details-meta-item" display="flex" alignItems="center" gap={1}>
                <Typography className="goal-details-meta-label" variant="caption">
                  {i18next.t("goalDetails.owner", "Owner")}
                </Typography>
                <UserDisplay user={currentGoal?.owner} fallbackId={currentGoal?.ownerId} />
                {canModify && (
                  <Controller
                    name="ownerId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        size="small"
                        label={i18next.t("goalDetails.ownerId", "Owner ID")}
                        disabled={actionLoading}
                        {...field}
                      />
                    )}
                  />
                )}
              </Box>
            </Box>
          </form>

          {currentGoal.picture && (
            <Box mt={1}>
              <img src={currentGoal.picture} alt="goal" style={{ maxWidth: 200, maxHeight: 200 }} />
            </Box>
          )}
        </Box>

        {(canModify || canDelete) && (
          <Box className="goal-details-actions" mt={2} display="flex" gap={1} flexWrap="wrap">
            {canModify && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={actionLoading}
                >
                  {i18next.t("goalDetails.uploadPicture", "Upload Picture")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePictureUpload(f);
                  }}
                />
                <Button type="submit" form="goal-details-form" variant="contained" disabled={actionLoading}>
                  {i18next.t("common.save", "Save")}
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                variant="contained"
                color="error"
                onClick={() => setDeleteOpen(true)}
                disabled={actionLoading}
              >
                {i18next.t("goalDetails.delete", "Delete")}
              </Button>
            )}
          </Box>
        )}

        <Box className="goal-details-section" mt={2}>
          <Typography variant="subtitle1">{i18next.t("goalDetails.seasons", "Seasons")}</Typography>
          {goalSeasons && goalSeasons.map((tag: any) => {
            const seasonId = tag.seasonId || tag;
            const season = seasons.find(s => s.id === seasonId);
            const displayName = season ? season.name : seasonId;
            return (
              <Box key={seasonId} display="flex" alignItems="center" gap={1} mt={0.5}>
                <Typography variant="body2">{displayName}</Typography>
                {currentGoal && canEditGoal(currentGoal) && (
                  <IconButton size="small" onClick={() => untagGoalFromSeason(teamId, goalId!, seasonId)}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            );
          })}
          {currentGoal && canEditGoal(currentGoal) && (
            <Box mt={1} maxWidth={300}>
              <TextField
                select
                size="small"
                fullWidth
                label={i18next.t("goalDetails.tagToSeason", "Tag to season")}
                value=""
                onChange={(e) => { if (e.target.value) tagGoalToSeason(teamId, goalId!, e.target.value); }}
              >
                {seasons
                  .filter(s => !goalSeasons.some((t: any) => (t.seasonId || t) === s.id))
                  .map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)
                }
              </TextField>
            </Box>
          )}
        </Box>

        <Box mt={4}>
          <CommentSection
            targetId={currentGoal.id}
            commentType={CommentType.Goal}
            enabled={commentsEnabled}
            allowFileUploads={settings?.allowFileUploads}
          />
        </Box>
      </Box>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{i18next.t("goalDetails.deleteGoal", "Delete Goal")}</DialogTitle>
        <DialogContent>
          <Typography>
            {i18next.t("goalDetails.deleteConfirm", "Are you sure you want to delete this goal?")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>
            {i18next.t("common.cancel", "Cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={onDelete} disabled={actionLoading}>
            {i18next.t("common.delete", "Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
