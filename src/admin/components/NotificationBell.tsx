import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  Typography,
} from "@mui/material";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import { apiService } from "../../api/service";
import { formatDateTime } from "../../utils/dateFormatter";
import { getDeliveryBadge, countActionable, type RecentDelivery } from "../../utils/deliveryStatus";

// The admin topbar's delivery notification feed - "a project was just
// marked Delivered" (and, if it was delivered on credit, whether it's
// been paid yet), reachable from every admin page instead of only the
// Dashboard's own "Recent Deliveries" panel. Polls independently of the
// Dashboard page (see /dashboard/notifications/deliveries - a lightweight
// endpoint built specifically so this doesn't have to pull the whole
// summary payload just to show a handful of rows).
const POLL_INTERVAL_MS = 60_000;

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [deliveries, setDeliveries] = useState<RecentDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => {
      apiService
        .get<RecentDelivery[]>("/dashboard/notifications/deliveries", { params: { limit: 8 } })
        .then((data) => {
          if (active) {
            setDeliveries(data);
            setLoadError(false);
          }
        })
        .catch(() => {
          if (active) setLoadError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    load();
    // Deliveries aren't frequent enough to need a websocket, but this is
    // meant to read as "live" rather than only refreshing on a full page
    // reload - a minute-old delivery notice is still timely for this app.
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // The badge count is "how many need your attention" (still-unpaid
  // credit deliveries), not "how many deliveries happened recently" -
  // the latter is just activity volume, not something actionable.
  const actionableCount = countActionable(deliveries);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
        aria-label={actionableCount > 0 ? `${actionableCount} deliveries need attention` : "Notifications"}
        aria-controls={open ? "delivery-notifications-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        sx={{
          p: 1,
          mr: 0.5,
          color: "var(--slate-600)",
          "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
        }}
      >
        <Badge
          badgeContent={actionableCount}
          color="error"
          sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", fontWeight: 700, minWidth: 16, height: 16 } }}
        >
          <NotificationsRoundedIcon sx={{ fontSize: 22 }} />
        </Badge>
      </IconButton>

      <Menu
        id="delivery-notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            elevation: 2,
            sx: {
              mt: 1,
              width: 360,
              maxWidth: "90vw",
              borderRadius: "12px",
              border: "1px solid var(--slate-200)",
              boxShadow: "0px 8px 24px -4px rgba(15, 23, 42, 0.12)",
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid var(--slate-100)" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--slate-900)" }}>
            Recent Deliveries
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {actionableCount > 0
              ? `${actionableCount} delivered on credit, still unpaid`
              : "All caught up"}
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={22} thickness={4} />
            </Box>
          ) : loadError ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              Couldn't load notifications.
            </Typography>
          ) : deliveries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              No deliveries recorded yet.
            </Typography>
          ) : (
            deliveries.map((d) => {
              const badge = getDeliveryBadge(d);
              return (
                <Box
                  key={d.id}
                  onClick={() => {
                    setAnchorEl(null);
                    navigate(`/admin/projects?projectId=${d.id}`);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 2,
                    py: 1.25,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--slate-50)",
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: "var(--slate-50)" },
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "8px",
                      bgcolor: "var(--blue-50)",
                      color: "var(--blue-600)",
                      border: "1px solid var(--blue-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <LocalShippingRoundedIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
                      {d.customer_name || "Unnamed Client"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--slate-400)" }} noWrap>
                      {d.project_type} · {formatDateTime(d.delivered_at)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.3,
                      borderRadius: 999,
                      bgcolor: badge.bg,
                      color: badge.color,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {badge.label}
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        <Box
          onClick={() => {
            setAnchorEl(null);
            navigate("/admin/dashboard");
          }}
          sx={{
            px: 2,
            py: 1.25,
            textAlign: "center",
            cursor: "pointer",
            borderTop: "1px solid var(--slate-100)",
            "&:hover": { bgcolor: "var(--slate-50)" },
          }}
        >
          <Typography variant="caption" sx={{ color: "var(--blue-600)", fontWeight: 700 }}>
            View Dashboard
          </Typography>
        </Box>
      </Menu>
    </>
  );
}
