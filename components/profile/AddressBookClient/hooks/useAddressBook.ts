import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ShippingAddressDto } from '@/features/address/address.dto'
import { toFormState, toPayload } from '../addressBook.helpers'
import type { AddressBookField, AddressBookMode } from '../types'

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error: { message: string; code: string } }

export function useAddressBook(initialAddresses: ShippingAddressDto[]) {
  const router = useRouter()
  const [addresses, setAddresses] = useState(initialAddresses)
  const [mode, setMode] = useState<AddressBookMode>(null)
  const [formState, setFormState] = useState(toFormState())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const openCreate = () => {
    setMode({ type: 'create' })
    setFormState(toFormState())
    setErrorMessage(null)
  }

  const openEdit = (address: ShippingAddressDto) => {
    setMode({ type: 'edit', addressId: address.id })
    setFormState(toFormState(address))
    setErrorMessage(null)
  }

  const closeForm = () => {
    setMode(null)
    setErrorMessage(null)
  }

  const handleFieldChange = (field: AddressBookField, value: string | boolean) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const payload = toPayload(formState)
      const url =
        mode?.type === 'edit'
          ? `/api/profile/addresses/${mode.addressId}`
          : '/api/profile/addresses'
      const method = mode?.type === 'edit' ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = (await response.json()) as ApiSuccess<ShippingAddressDto> | ApiError
      if (!json.success) {
        setErrorMessage(json.error.message)
        return
      }

      let nextAddresses =
        mode?.type === 'edit'
          ? addresses.map((address) => (address.id === json.data.id ? json.data : address))
          : [json.data, ...addresses]

      if (formState.isDefault) {
        const optimisticDefault = nextAddresses.map((address) => ({
          ...address,
          isDefault: address.id === json.data.id,
        }))
        setAddresses(optimisticDefault)

        const defaultResponse = await fetch(`/api/profile/addresses/${json.data.id}/default`, {
          method: 'POST',
        })

        if (!defaultResponse.ok) {
          setAddresses(nextAddresses)
          setErrorMessage('Адресу збережено, але не вдалося зробити її основною.')
        } else {
          nextAddresses = optimisticDefault
        }
      }

      setAddresses(nextAddresses)
      closeForm()
      router.refresh()
    })
  }

  const handleDelete = (addressId: string) => {
    const previousAddresses = addresses
    setAddresses((current) => current.filter((address) => address.id !== addressId))
    setErrorMessage(null)

    startTransition(async () => {
      const response = await fetch(`/api/profile/addresses/${addressId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setAddresses(previousAddresses)
        setErrorMessage('Не вдалося видалити адресу. Спробуйте ще раз.')
        return
      }

      router.refresh()
    })
  }

  const handleSetDefault = (addressId: string) => {
    const previousAddresses = addresses
    const optimisticAddresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === addressId,
    }))

    setAddresses(optimisticAddresses)
    setErrorMessage(null)

    startTransition(async () => {
      const response = await fetch(`/api/profile/addresses/${addressId}/default`, {
        method: 'POST',
      })

      if (!response.ok) {
        setAddresses(previousAddresses)
        setErrorMessage('Не вдалося оновити основну адресу.')
        return
      }

      router.refresh()
    })
  }

  return {
    addresses,
    mode,
    formState,
    errorMessage,
    isPending,
    openCreate,
    openEdit,
    closeForm,
    handleFieldChange,
    handleSubmit,
    handleDelete,
    handleSetDefault,
  }
}
