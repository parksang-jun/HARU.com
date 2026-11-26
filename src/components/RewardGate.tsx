// 보상형 광고 안내 창 — 무료 횟수를 다 썼을 때 "광고 보고 더 받기"
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/context'
import { showRewarded } from '../lib/ads'
import { canWatch, grant, REWARD_RULES, rewardPreview, saveRewards, type RewardKind, type RewardState } from '../lib/rewards'

interface Props {
  kind: RewardKind
  state: RewardState
  /** 광고를 다 보고 횟수를 받았을 때 */
  onGranted: (next: RewardState) => void
  onClose: () => void
}

const PREVIEW_SEC = 3

export function RewardGate({ kind, state, onGranted, onClose }: Props) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<'ask' | 'playing' | 'failed'>('ask')
  const [left, setLeft] = useState(PREVIEW_SEC)
  const can = canWatch(state, kind)

  const done = async () => {
    const next = grant(state, kind)
    await saveRewards(next)
    onGranted(next)
  }

  // 테스트 베드: 실제 광고 대신 3초 미리보기
  useEffect(() => {
    if (phase !== 'playing' || !rewardPreview()) return
    if (left <= 0) {
      void done()
      return
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, left])

  const watch = async () => {
    setPhase('playing')
    if (rewardPreview()) return
    if (await showRewarded()) await done()
    else setPhase('failed')
  }

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-label={t('reward.title')} data-testid="reward-gate" data-kind={kind}>
      <div className="gate__box card">
        {phase === 'playing' && rewardPreview() ? (
          <>
            <span className="badge badge--sponsored">{t('common.sponsored')}</span>
            <p className="gate__preview" data-testid="reward-preview">
              {t('reward.preview', { n: left })}
            </p>
            <p className="xs muted">{t('reward.previewNote')}</p>
          </>
        ) : (
          <>
            <h2>{t('reward.title')}</h2>
            <p className="small">{t(`reward.${kind}Body`, { free: REWARD_RULES[kind].free, n: REWARD_RULES[kind].perAd })}</p>
            {phase === 'failed' && (
              <p className="alert small" role="alert">
                {t('reward.failed')}
              </p>
            )}
            {can ? (
              <button type="button" className="btn btn--primary btn--block" onClick={watch} disabled={phase === 'playing'} data-testid="reward-watch">
                {t('reward.watch', { n: REWARD_RULES[kind].perAd })}
              </button>
            ) : (
              <p className="small muted" data-testid="reward-maxed">
                {t('reward.maxed')}
              </p>
            )}
            <button type="button" className="btn btn--block btn--ghost" onClick={onClose} data-testid="reward-close">
              {t('reward.close')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
