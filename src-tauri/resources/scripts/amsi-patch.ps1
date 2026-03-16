$type = [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
if ($type) {
    $field = $type.GetField('amsiContext', 'NonPublic,Static')
    if ($field) {
        Write-Output "AMSI type and field resolved via Reflection"
        Write-Output "Field type: $($field.FieldType.Name)"
        Write-Output "Current value: $($field.GetValue($null))"
    } else {
        Write-Output "AMSI type found but field inaccessible"
    }
} else {
    Write-Output "AMSI type not available"
}
