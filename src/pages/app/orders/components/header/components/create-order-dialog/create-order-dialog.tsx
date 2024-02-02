import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { toast } from 'sonner'

import { createOrder, Order } from '@/api/orders/create-order'
import { GetOrdersResponse } from '@/api/orders/get-orders'
import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import { CreateOrderType } from '../../header'
import { CustomersCombobox } from './components/customers-combobox/customers-combobox'
import { ItemTable } from './components/items/components/table/item-table'

interface CreateOrderDialogProps {
  handleOpenDialog: (open: boolean) => void
}

export function CreateOrderDialog({
  handleOpenDialog,
}: CreateOrderDialogProps) {
  const {
    handleSubmit,
    reset,
    formState: { errors },
    control,
  } = useFormContext<CreateOrderType>()

  const {
    fields: items,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'items',
  })

  const queryClient = useQueryClient()

  function updateOrdersCache(order: Order, customerName: string) {
    const cached = queryClient.getQueryData<GetOrdersResponse>([
      'orders',
      0, // pageIndex
      null, // orderId
      null, // customerName
      null, // status
    ])
    if (!cached) {
      return
    }

    queryClient.setQueryData<GetOrdersResponse>(
      [
        'orders',
        0, // pageIndex
        null, // orderId
        null, // customerName
        null, // status
      ],
      {
        ...cached,
        orders: [
          {
            orderId: order.id,
            createdAt: order.createdAt,
            status: order.status,
            customerName,
            total: order.total,
          },
          ...cached.orders,
        ],
      },
    )
  }

  const { mutateAsync: createOrderFn } = useMutation({
    mutationFn: createOrder,
  })

  async function handleCreateOrder(data: CreateOrderType) {
    try {
      const response = await createOrderFn({
        customerId: data.customerId,
        items: data.items.map((item) => {
          return {
            productId: item.product.id,
            quantity: item.quantity,
          }
        }),
      })

      updateOrdersCache(response, data.customerName)
      handleOpenDialog(false)
      toast.success('Pedido cadastrado com sucesso')
    } catch {
      toast.error('Erro ao cadastrar pedido')
    }
  }

  function addItem() {
    append({
      product: {
        id: '',
        name: '',
        price: 0,
      },
      quantity: 0,
      subtotal: 0,
    })
  }

  function removeItem(index: number) {
    remove(index)
  }

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Novo Pedido</DialogTitle>
        <DialogDescription>Crie um novo pedido</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(handleCreateOrder)}>
        <div className="space-y-10 py-4">
          <div>
            <div className="ml-4 flex items-center gap-4">
              <Label className="text-right">Cliente</Label>
              <CustomersCombobox />
            </div>
          </div>
          <div className="ml-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label className="text-right">Itens</Label>
              {errors.items && (
                <span className="text-rose-500">
                  {errors.items.message ===
                  'Array must contain at least 1 element(s)'
                    ? 'Adicione ao menos um item ao pedido'
                    : errors.items.message}
                </span>
              )}
            </div>
            <Button type="button" variant="secondary" onClick={addItem}>
              Adicionar
            </Button>
          </div>
          <ItemTable items={items} removeItem={removeItem} />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" onClick={() => reset()}>
              Cancelar
            </Button>
          </DialogClose>
          <Button variant="success">Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
