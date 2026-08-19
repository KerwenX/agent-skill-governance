import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DemoLauncher from "../pages/DemoLauncher";
import DeveloperShell from "../components/developer/DeveloperShell";
import DevOverview from "../pages/developer/DevOverview";
import DevInbox from "../pages/developer/DevInbox";
import DevEvidence from "../pages/developer/DevEvidence";
import DevCandidateReview from "../pages/developer/DevCandidateReview";
import DevContractEditor from "../pages/developer/DevContractEditor";
import DevImpactAnalysis from "../pages/developer/DevImpactAnalysis";
import DevPropagation from "../pages/developer/DevPropagation";
import DevDependencies from "../pages/developer/DevDependencies";
import DevContractDetail from "../pages/developer/DevContractDetail";
import DevHistory from "../pages/developer/DevHistory";
import UserShell from "../components/user/UserShell";
import UserAgentWorkspace from "../pages/user/UserAgentWorkspace";
import UserEvidenceNew from "../pages/user/UserEvidenceNew";
import UserGovernance from "../pages/user/UserGovernance";
import UserGovernanceNew from "../pages/user/UserGovernanceNew";
import UserUpdates from "../pages/user/UserUpdates";
import UserRevalidation from "../pages/user/UserRevalidation";
import UserConflicts from "../pages/user/UserConflicts";
import UserHistory from "../pages/user/UserHistory";
import NotificationCenter from "../components/common/NotificationCenter";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/demo" replace />} />
        <Route path="/demo" element={<DemoLauncher />} />

        {/* Developer */}
        <Route path="/developer" element={<DeveloperShell />}>
          <Route index element={<DevOverview />} />
          <Route path="inbox" element={<DevInbox />} />
          <Route path="证据" element={<DevEvidence />} />
          <Route path="证据/:clusterId" element={<DevEvidence />} />
          <Route path="candidates" element={<DevInbox />} />
          <Route path="candidates/:candidateId" element={<DevCandidateReview />} />
          <Route path="contracts" element={<DevOverview />} />
          <Route path="contracts/new" element={<DevContractEditor />} />
          <Route path="contracts/:contractId" element={<DevContractDetail />} />
          <Route path="impact/:draftId" element={<DevImpactAnalysis />} />
          <Route path="propagation/:changeSetId" element={<DevPropagation />} />
          <Route path="dependencies" element={<DevDependencies />} />
          <Route path="history" element={<DevHistory />} />
        </Route>

        {/* User */}
        <Route path="/user/:userId" element={<UserShell />}>
          <Route index element={<Navigate to="agent/agent-user-a" replace />} />
          <Route path="agent/:agentId" element={<UserAgentWorkspace />} />
          <Route path="证据/new/:runtimeId" element={<UserEvidenceNew />} />
          <Route path="governance" element={<UserGovernance />} />
          <Route path="governance/new" element={<UserGovernanceNew />} />
          <Route path="updates" element={<UserUpdates />} />
          <Route path="revalidation/:contractId" element={<UserRevalidation />} />
          <Route path="conflicts/:contractId" element={<UserConflicts />} />
          <Route path="history" element={<UserHistory />} />
        </Route>

        <Route path="*" element={<Navigate to="/demo" replace />} />
      </Routes>
      <NotificationCenter />
    </>
  );
}
