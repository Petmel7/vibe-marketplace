import {
  COMMISSION_RULE_SCOPES,
  getCommissionRuleScopeHint,
  getCommissionRuleScopeLabel,
  type CommissionRuleScope,
} from '@/types/commissions'

export default function CommissionScopeSelector({
  value,
  onChange,
}: {
  value: CommissionRuleScope
  onChange: (value: CommissionRuleScope) => void
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-copy-strong">Область дії</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CommissionRuleScope)}
        className="ui-surface-input"
      >
        {COMMISSION_RULE_SCOPES.map((scope) => (
          <option key={scope} value={scope}>
            {getCommissionRuleScopeLabel(scope)}
          </option>
        ))}
      </select>
      <p className="text-xs text-copy-muted">{getCommissionRuleScopeHint(value)}</p>
    </label>
  )
}
