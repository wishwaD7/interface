import { Currency, NativeCurrency, Token } from '@uniswap/sdk-core'
import { WarningSeverity } from 'uniswap/src/components/modals/WarningModal/types'
import { ProtectionResult } from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'
import { AttackType, CurrencyInfo, SafetyInfo, TokenList } from 'uniswap/src/features/dataApi/types'
import {
  TokenProtectionWarning,
  getFeeColor,
  getFeeWarning,
  getShouldHaveCombinedPluralTreatment,
  getTokenProtectionWarning,
  getTokenWarningSeverity,
  useModalHeaderText,
  useModalSubtitleText,
} from 'uniswap/src/features/tokens/safetyUtils'

jest.mock('react-i18next', () => ({
  useTranslation: (): { t: (str: string) => string } => {
    return {
      t: (str: string): string => str,
    }
  },
}))

describe('safetyUtils', () => {
  const mockCurrency = {
    symbol: 'UNI',
    sellFeeBps: { toNumber: () => 0 },
    buyFeeBps: { toNumber: () => 0 },
    isToken: true,
  } as Token
  const mockNativeCurrency = { isNative: true } as NativeCurrency
  const mockSafetyInfo: SafetyInfo = {
    tokenList: TokenList.Default,
    protectionResult: ProtectionResult.Benign,
    attackType: AttackType.Other,
  }
  const mockCurrencyInfo = {
    currency: mockCurrency,
    safetyInfo: mockSafetyInfo,
  } as CurrencyInfo
  const mockNativeCurrencyInfo = {
    currency: mockNativeCurrency,
    safetyInfo: mockSafetyInfo,
  } as CurrencyInfo

  describe('getTokenWarningSeverity', () => {
    it('should return None when currencyInfo is fully undefined', () => {
      expect(getTokenWarningSeverity(undefined)).toBe(WarningSeverity.None)
    })

    it('should return Low when currencyInfo is defined but safetyInfo is undefined', () => {
      expect(getTokenWarningSeverity({ ...mockCurrencyInfo, safetyInfo: undefined })).toBe(WarningSeverity.Low)
    })

    it('should return Low for non-default token', () => {
      const nonDefaultCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: { ...mockSafetyInfo, tokenList: TokenList.NonDefault },
      }
      expect(getTokenWarningSeverity(nonDefaultCurrencyInfo)).toBe(WarningSeverity.Low)
    })

    it('should return Medium for spam airdrop', () => {
      const airdropCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: {
          ...mockSafetyInfo,
          protectionResult: ProtectionResult.Spam,
          attackType: AttackType.Airdrop,
        },
      }
      expect(getTokenWarningSeverity(airdropCurrencyInfo)).toBe(WarningSeverity.Medium)
    })

    it('should return Medium for low fee on transfer', () => {
      const lowFeeCurrencyInfo = {
        ...mockCurrencyInfo,
        currency: {
          ...mockCurrency,
          sellFeeBps: { toNumber: () => 100 }, // 1%
          buyFeeBps: { toNumber: () => 100 },
        } as Currency,
      }
      expect(getTokenWarningSeverity(lowFeeCurrencyInfo)).toBe(WarningSeverity.Medium)
    })

    it('should return High for malicious impersonator', () => {
      const impersonatorCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: {
          ...mockSafetyInfo,
          protectionResult: ProtectionResult.Malicious,
          attackType: AttackType.Impersonator,
        },
      }
      expect(getTokenWarningSeverity(impersonatorCurrencyInfo)).toBe(WarningSeverity.High)
    })

    it('should return High for very high fee on transfer', () => {
      const highFeeCurrencyInfo = {
        ...mockCurrencyInfo,
        currency: {
          ...mockCurrency,
          sellFeeBps: { toNumber: () => 8100 }, // 81%
          buyFeeBps: { toNumber: () => 8100 },
        } as Currency,
      }
      expect(getTokenWarningSeverity(highFeeCurrencyInfo)).toBe(WarningSeverity.High)
    })

    it('should return None for default token with no warnings', () => {
      expect(getTokenWarningSeverity(mockCurrencyInfo)).toBe(WarningSeverity.None)
    })

    it('should return None for native currency', () => {
      expect(getTokenWarningSeverity(mockNativeCurrencyInfo)).toBe(WarningSeverity.None)
    })

    it('should return Blocked when tokenList is Blocked', () => {
      const blockedCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: { ...mockSafetyInfo, tokenList: TokenList.Blocked },
      }
      expect(getTokenWarningSeverity(blockedCurrencyInfo)).toBe(WarningSeverity.Blocked)
    })
  })

  describe('getShouldHaveCombinedPluralTreatment', () => {
    it('should return false when only one currencyInfo is provided', () => {
      expect(getShouldHaveCombinedPluralTreatment(mockCurrencyInfo)).toBe(false)
    })

    it('should return true when both currencyInfos have Low warning', () => {
      const lowCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: { ...mockSafetyInfo, tokenList: TokenList.NonDefault },
      }
      expect(getShouldHaveCombinedPluralTreatment(lowCurrencyInfo, lowCurrencyInfo)).toBe(true)
    })

    it('should return false when one has low warning and the other has high warning', () => {
      const lowCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: { ...mockSafetyInfo, tokenList: TokenList.NonDefault },
      }
      const highCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: { ...mockSafetyInfo, protectionResult: ProtectionResult.Malicious },
      }
      expect(getShouldHaveCombinedPluralTreatment(lowCurrencyInfo, highCurrencyInfo)).toBe(false)
    })
  })

  describe('useModalHeaderText', () => {
    it('should return null for default token with no warnings', () => {
      expect(useModalHeaderText(mockCurrencyInfo)).toBeNull()
    })

    it('should return appropriate text for blocked token', () => {
      const blockedCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: { ...mockSafetyInfo, tokenList: TokenList.Blocked },
      }
      expect(useModalHeaderText(blockedCurrencyInfo)).toBe('token.safety.blocked.title.tokenNotAvailable')
    })
  })

  describe('useModalSubtitleText', () => {
    it('should return null for default token with no warnings', () => {
      expect(useModalSubtitleText(mockCurrencyInfo)).toBeNull()
    })

    it('should return appropriate text for non-default token', () => {
      const nonDefaultCurrencyInfo = {
        ...mockCurrencyInfo,
        safetyInfo: { ...mockSafetyInfo, tokenList: TokenList.NonDefault },
      }
      expect(useModalSubtitleText(nonDefaultCurrencyInfo)).toBe('token.safety.warning.medium.heading.named')
    })
  })

  describe('getFeeColor', () => {
    it.each([
      [0, '$neutral1', 'no fee'],
      [0.03, '$statusWarning', 'low fee'],
      [10, '$statusCritical', 'high fee'],
      [85, '$statusCritical', 'very high fee'],
      [100, '$statusCritical', 'honeypot fee'],
    ])('should return %s for %s', (fee, expectedColor, _) => {
      expect(getFeeColor(fee)).toBe(expectedColor)
    })
  })

  describe('getTokenProtectionWarning', () => {
    it.each([
      // Basic cases
      [undefined, TokenProtectionWarning.NonDefault, 'undefined currencyInfo -> NonDefault'],
      [
        { ...mockCurrencyInfo, safetyInfo: undefined },
        TokenProtectionWarning.NonDefault,
        'missing safetyInfo -> NonDefault',
      ],
      [mockNativeCurrencyInfo, TokenProtectionWarning.None, 'native currency -> None'],
      [mockCurrencyInfo, TokenProtectionWarning.None, 'default token -> None'],

      // Token list cases
      [
        {
          ...mockCurrencyInfo,
          safetyInfo: { ...mockSafetyInfo, tokenList: TokenList.Blocked },
        },
        TokenProtectionWarning.Blocked,
        'blocked token -> Blocked',
      ],
      [
        {
          ...mockCurrencyInfo,
          safetyInfo: { ...mockSafetyInfo, tokenList: TokenList.NonDefault },
        },
        TokenProtectionWarning.NonDefault,
        'non-default token -> NonDefault',
      ],

      // Fee-based cases
      [
        {
          ...mockCurrencyInfo,
          currency: {
            ...mockCurrency,
            sellFeeBps: { toNumber: () => 10000 },
            buyFeeBps: { toNumber: () => 10000 },
          } as Currency,
        },
        TokenProtectionWarning.MaliciousHoneypot,
        '100% fee -> MaliciousHoneypot',
      ],
      [
        {
          ...mockCurrencyInfo,
          currency: {
            ...mockCurrency,
            sellFeeBps: { toNumber: () => 8500 },
            buyFeeBps: { toNumber: () => 8500 },
          } as Currency,
        },
        TokenProtectionWarning.FotVeryHigh,
        'high fees (85%) -> FotVeryHigh',
      ],
      [
        {
          ...mockCurrencyInfo,
          currency: {
            ...mockCurrency,
            sellFeeBps: { toNumber: () => 2000 },
            buyFeeBps: { toNumber: () => 2000 },
          } as Currency,
        },
        TokenProtectionWarning.FotHigh,
        'medium-high fees (20%) -> FotHigh',
      ],
      [
        {
          ...mockCurrencyInfo,
          currency: {
            ...mockCurrency,
            sellFeeBps: { toNumber: () => 300 },
            buyFeeBps: { toNumber: () => 300 },
          } as Currency,
        },
        TokenProtectionWarning.FotLow,
        'low fees (3%) -> FotLow',
      ],
      [
        {
          ...mockCurrencyInfo,
          currency: {
            ...mockCurrency,
            sellFeeBps: { toNumber: () => 300 },
            buyFeeBps: { toNumber: () => 8500 },
          } as Currency,
        },
        TokenProtectionWarning.FotVeryHigh,
        'mixed fees (3% sell, 85% buy) -> FotVeryHigh',
      ],

      // Attack type cases
      [
        {
          ...mockCurrencyInfo,
          safetyInfo: {
            ...mockSafetyInfo,
            protectionResult: ProtectionResult.Malicious,
            attackType: AttackType.Impersonator,
          },
        },
        TokenProtectionWarning.MaliciousImpersonator,
        'malicious impersonator attack -> MaliciousImpersonator',
      ],
      [
        {
          ...mockCurrencyInfo,
          safetyInfo: {
            ...mockSafetyInfo,
            protectionResult: ProtectionResult.Spam,
            attackType: AttackType.Airdrop,
          },
        },
        TokenProtectionWarning.SpamAirdrop,
        'spam airdrop attack -> SpamAirdrop',
      ],
      [
        {
          ...mockCurrencyInfo,
          safetyInfo: {
            ...mockSafetyInfo,
            protectionResult: ProtectionResult.Malicious,
            attackType: AttackType.Other,
          },
        },
        TokenProtectionWarning.MaliciousGeneral,
        'other malicious attack -> MaliciousGeneral',
      ],

      // Edge cases
      [
        {
          ...mockCurrencyInfo,
          currency: {
            ...mockCurrency,
            sellFeeBps: undefined,
            buyFeeBps: undefined,
          } as Currency,
        },
        TokenProtectionWarning.None,
        'currency without fee properties -> None',
      ],
      [
        {
          ...mockCurrencyInfo,
          safetyInfo: {
            ...mockSafetyInfo,
            protectionResult: ProtectionResult.Unknown,
            attackType: undefined,
          },
        } satisfies CurrencyInfo,
        TokenProtectionWarning.None,
        'unknown protection result -> None',
      ],
      [
        {
          ...mockCurrencyInfo,
          safetyInfo: {
            ...mockSafetyInfo,
            protectionResult: ProtectionResult.Spam,
            attackType: AttackType.HighFees,
          },
        },
        TokenProtectionWarning.FotVeryHigh,
        'spam high fees attack -> FotVeryHigh',
      ],
      [
        {
          ...mockCurrencyInfo,
          safetyInfo: {
            ...mockSafetyInfo,
            protectionResult: ProtectionResult.Malicious,
            attackType: AttackType.HighFees,
          },
        },
        TokenProtectionWarning.FotVeryHigh,
        'malicious high fees attack -> FotVeryHigh',
      ],
    ])('%s', (currencyInfo, expectedWarning, _) => {
      expect(getTokenProtectionWarning(currencyInfo)).toBe(expectedWarning)
    })
  })

  describe('getFeeWarning', () => {
    it.each([
      [0, TokenProtectionWarning.None, '0% -> None'],
      // Low fees (0-5%)
      [0.3, TokenProtectionWarning.FotLow, '0.3% -> FotLow'],
      [4.2, TokenProtectionWarning.FotLow, '4.2% -> FotLow'],
      [0.99, TokenProtectionWarning.FotLow, '0.99% -> FotLow'],
      // High fees (5-80%)
      [5, TokenProtectionWarning.FotHigh, '5% -> FotHigh'],
      [50, TokenProtectionWarning.FotHigh, '50% -> FotHigh'],
      [79.9, TokenProtectionWarning.FotHigh, '79.9% -> FotHigh'],
      [51.23, TokenProtectionWarning.FotHigh, '51.23% -> FotHigh'],
      [67.89, TokenProtectionWarning.FotHigh, '67.89% -> FotHigh'],
      // Very high fees (80-100%)
      [80, TokenProtectionWarning.FotVeryHigh, '80% -> FotVeryHigh'],
      [90, TokenProtectionWarning.FotVeryHigh, '90% -> FotVeryHigh'],
      [84.56, TokenProtectionWarning.FotVeryHigh, '84.56% -> FotVeryHigh'],
      [99.9, TokenProtectionWarning.FotVeryHigh, '99.9% -> FotVeryHigh'],
      // Honeypot (100%)
      [100, TokenProtectionWarning.MaliciousHoneypot, '100% -> MaliciousHoneypot'],
      [100, TokenProtectionWarning.MaliciousHoneypot, '100% -> MaliciousHoneypot'],
    ])('%s', (fee, expectedWarning, _) => {
      expect(getFeeWarning(fee)).toBe(expectedWarning)
    })
  })
})
